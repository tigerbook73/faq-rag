import { NextRequest } from "next/server";
import { z } from "zod";
import { retrieve } from "@/src/lib/retrieval/query";
import { getProvider } from "@/src/lib/llm/router";

const bodySchema = z.object({
  question: z.string().min(1),
  provider: z.enum([/* "claude", */ "deepseek"]).default("deepseek"),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
});

const SYSTEM_PROMPT = `你是一个严格基于提供的知识片段回答问题的 FAQ 助手。
- 只使用 <context> 中的信息作答，不要编造。
- 如果 context 中没有足够信息，请明确回答「知识库中未找到相关信息」。
- 回答使用用户提问的语言。
- 每个关键论点后用 [^n] 标注引用编号，n 对应 context 中片段的编号。`;

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
    preview: c.content.slice(0, 200),
    score: Number(c.score),
  }));

  const contextBlock = chunks.map((c, i) => `[${i + 1}] (source: ${c.document_name})\n${c.content}`).join("\n\n");

  const userMessage = `<context>\n${contextBlock}\n</context>\n\n问题: ${question}`;

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
