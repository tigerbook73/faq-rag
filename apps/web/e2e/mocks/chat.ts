import type { Page } from "@playwright/test";

interface MockChatSession {
  id: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    citations?: typeof MOCK_CITATIONS;
  }>;
  createdAt: number;
  updatedAt: number;
}

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

function toApiSession(session: MockChatSession) {
  return {
    ...session,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
  };
}

export async function mockChatRoute(page: Page): Promise<void> {
  const sessions = new Map<string, MockChatSession>();

  await page.route("/api/chat", (route) => {
    const body =
      sse({ type: "citations", citations: MOCK_CITATIONS, provider: "claude" }) +
      sse({ type: "token", token: "Employees receive " }) +
      sse({ type: "token", token: "15 vacation days per year. [1]" }) +
      sse({ type: "done", answer: MOCK_ANSWER, citations: MOCK_CITATIONS });

    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body,
    });
  });

  await page.route("/api/sessions", (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        [...sessions.values()].map((session) => {
          const { id, title, createdAt, updatedAt } = toApiSession(session);
          return { id, title, createdAt, updatedAt };
        }),
      ),
    });
  });

  await page.route(/\/api\/sessions\/[^/]+$/, async (route) => {
    const request = route.request();
    const id = new URL(request.url()).pathname.split("/").pop();
    if (!id) return route.fulfill({ status: 400 });

    if (request.method() === "GET") {
      const session = sessions.get(id);
      return route.fulfill({
        status: session ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(session ? toApiSession(session) : { error: "Not found" }),
      });
    }

    if (request.method() === "PATCH") {
      const now = Date.now();
      const body = request.postDataJSON() as Partial<Pick<MockChatSession, "title" | "messages">>;
      const existing = sessions.get(id);
      const session: MockChatSession = {
        id,
        title: body.title ?? existing?.title ?? "New Chat",
        messages: body.messages ?? existing?.messages ?? [],
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: now,
      };
      sessions.set(id, session);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(toApiSession(session)),
      });
    }

    if (request.method() === "DELETE") {
      sessions.delete(id);
      return route.fulfill({ status: 204 });
    }

    return route.fallback();
  });
}
