import { test, expect } from "../../fixtures/auth";

test.describe("multi-user session isolation", () => {
  test("user2 cannot list or load user1 sessions", async ({ user1Page, user2Page }) => {
    const sessionId = crypto.randomUUID();
    const title = `e2e-session-${sessionId}`;

    const createRes = await user1Page.request.post("/api/sessions", {
      data: { id: sessionId, title },
    });
    expect(createRes.status()).toBe(201);

    const user2SessionsRes = await user2Page.request.get("/api/sessions");
    expect(user2SessionsRes.status()).toBe(200);
    const user2Sessions = (await user2SessionsRes.json()) as Array<{ id: string; title: string }>;
    expect(user2Sessions.some((session) => session.id === sessionId || session.title === title)).toBe(false);

    const directRes = await user2Page.request.get(`/api/sessions/${sessionId}`);
    expect(directRes.status()).toBe(404);

    await user2Page.goto(`/chat/${sessionId}`);
    await expect(user2Page).toHaveURL((url) => url.pathname === "/chat/new");

    await user1Page.request.delete(`/api/sessions/${sessionId}`);
  });
});
