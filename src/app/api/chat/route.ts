import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { retrieve } from "@/lib/retrieval/query";
import { getProvider } from "@/lib/llm/router";
import { PROVIDER } from "@/lib/llm/providers";
import { checkRateLimit } from "@/lib/rate-limit";
import { truncateHistory } from "@/lib/llm/truncate";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z.enum([PROVIDER.DEEPSEEK, PROVIDER.OPENAI, PROVIDER.CLAUDE]).default(PROVIDER.DEEPSEEK),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(50)
    .default([]),
});

const SYSTEM_PROMPT = `You are an FAQ assistant that answers strictly based on the provided knowledge snippets.
- Only use information from <context>. Do not fabricate answers.
- If the context lacks sufficient information, explicitly say "No relevant information found in the knowledge base." in required language.
- Always respond in the same language the user used to ask their question.
- After each key claim, add a citation marker [^n] where n matches the snippet number in context.`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`chat:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { question, provider: providerName, history } = body;

  const traceId = crypto.randomUUID();
  const log = logger.child({ traceId, provider: providerName });
  log.info({ question: question.slice(0, 100) }, "chat request");

  const t0 = Date.now();
  const chunks = await retrieve(question, traceId);
  log.info({ retrieval_total_ms: Date.now() - t0, chunks: chunks.length }, "retrieval complete");

  const citations = chunks.map((c, i) => ({
    id: i + 1,
    documentId: c.document_id,
    documentName: c.document_name,
    chunkId: c.id,
    preview: c.content,
    score: Number(c.score),
  }));

  function sanitizeChunkContent(content: string): string {
    return content.replace(/\[\^(\d+)\]/g, "(^$1)").replace(/\[(\d+)\]/g, "($1)");
  }

  const contextBlock = chunks
    .map((c, i) => `[${i + 1}] (source: ${c.document_name})\n${sanitizeChunkContent(c.content)}`)
    .join("\n\n");

  const userMessage = `<context>\n${contextBlock}\n</context>\n\nQuestion: ${question}`;

  const provider = getProvider(providerName);
  const messages = [...truncateHistory(history), { role: "user" as const, content: userMessage }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let answer = "";

      // send citations first as a JSON event
      const citationsPayload = `data: ${JSON.stringify({ type: "citations", citations, provider: providerName })}\n\n`;
      controller.enqueue(encoder.encode(citationsPayload));

      const tLlm = Date.now();
      let firstToken = true;
      try {
        for await (const token of provider.chat({
          system: SYSTEM_PROMPT,
          messages,
        })) {
          if (firstToken) {
            log.debug({ llm_first_token_ms: Date.now() - tLlm }, "first token");
            firstToken = false;
          }
          answer += token;
          const tokenPayload = `data: ${JSON.stringify({ type: "token", token })}\n\n`;
          controller.enqueue(encoder.encode(tokenPayload));
        }

        log.info({ llm_total_ms: Date.now() - tLlm, answer_len: answer.length }, "llm done");
        const donePayload = `data: ${JSON.stringify({ type: "done", answer })}\n\n`;
        controller.enqueue(encoder.encode(donePayload));
      } catch (err) {
        log.error({ err }, "llm error");
        const errPayload = `data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`;
        controller.enqueue(encoder.encode(errPayload));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
