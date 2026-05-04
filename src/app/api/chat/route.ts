import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { retrieve } from "@/lib/retrieval/query";
import { sanitizeChunkContent } from "@/lib/retrieval/utils";
import { getProvider } from "@/lib/llm/router";
import { SYSTEM_PROMPT } from "@/lib/llm/prompts";
import { truncateHistory } from "@/lib/llm/truncate";
import { logger } from "@/lib/logger";
import { ChatRequestInputSchema, type ChatRequestInput } from "@/lib/schemas/chat";
import { getApiUser } from "@/lib/auth/get-api-user";
import { corsPreflightResponse, withCors } from "@/lib/http/cors";

export function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
  }

  let body: ChatRequestInput;
  try {
    body = ChatRequestInputSchema.parse(await req.json());
  } catch (err) {
    return withCors(NextResponse.json({ error: String(err) }, { status: 400 }), req);
  }

  const { question, provider: providerName, history } = body;

  const traceId = crypto.randomUUID();
  const log = logger.child({ traceId, provider: providerName, userId: user.id });
  log.info({ question: question.slice(0, 100) }, "chat request");

  const t0 = Date.now();
  const chunks = await retrieve(question, traceId, providerName);
  log.info({ retrieval_total_ms: Date.now() - t0, chunks: chunks.length }, "retrieval complete");

  const citations = chunks.map((c, i) => ({
    id: i + 1,
    documentId: c.document_id,
    documentName: c.document_name,
    chunkId: c.id,
    preview: c.content,
    score: Number(c.score),
  }));

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

  return withCors(
    new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
    req,
  );
}
