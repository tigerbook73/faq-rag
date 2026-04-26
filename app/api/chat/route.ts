import { NextRequest } from "next/server";
import { z } from "zod";
import { retrieve } from "@/src/lib/retrieval/query";
import { getProvider } from "@/src/lib/llm/router";
import { PROVIDER } from "@/src/lib/llm/providers";

const bodySchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z.enum([PROVIDER.CLAUDE, PROVIDER.DEEPSEEK]).default(PROVIDER.DEEPSEEK),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(50)
    .default([]),
});

const SYSTEM_PROMPT = `You are an FAQ assistant that answers strictly based on the provided knowledge snippets.
- Only use information from <context>. Do not fabricate answers.
- If the context lacks sufficient information, explicitly say "No relevant information found in the knowledge base."
- Always respond in the same language the user used to ask their question.
- After each key claim, add a citation marker [^n] where n matches the snippet number in context.`;

export async function POST(req: NextRequest) {
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

  const chunks = await retrieve(question);

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
  const messages = [...history, { role: "user" as const, content: userMessage }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let answer = "";

      // send citations first as a JSON event
      const citationsPayload = `data: ${JSON.stringify({ type: "citations", citations, provider: providerName })}\n\n`;
      controller.enqueue(encoder.encode(citationsPayload));

      try {
        for await (const token of provider.chat({ system: SYSTEM_PROMPT, messages })) {
          answer += token;
          const tokenPayload = `data: ${JSON.stringify({ type: "token", token })}\n\n`;
          controller.enqueue(encoder.encode(tokenPayload));
        }

        const donePayload = `data: ${JSON.stringify({ type: "done", answer })}\n\n`;
        controller.enqueue(encoder.encode(donePayload));
      } catch (err) {
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
