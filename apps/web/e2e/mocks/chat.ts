import type { Page } from "@playwright/test";

const MOCK_CITATIONS = [
  {
    id: 1,
    documentId: "doc-mock-1",
    documentName: "Employee Handbook",
    chunkId: "chunk-mock-1",
    preview: "Employees receive 15 vacation days per year.",
    score: 0.95,
  },
];

const MOCK_ANSWER = "Employees receive 15 vacation days per year. [1]";

function sse(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function mockChatRoute(page: Page): Promise<void> {
  await page.route("/api/chat", (route) => {
    const body =
      sse({ type: "citations", citations: MOCK_CITATIONS, provider: "claude" }) +
      sse({ type: "token", token: "Employees receive " }) +
      sse({ type: "token", token: "15 vacation days per year. [1]" }) +
      sse({ type: "done", answer: MOCK_ANSWER });

    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body,
    });
  });
}
