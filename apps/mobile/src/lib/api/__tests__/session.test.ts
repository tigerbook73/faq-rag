/**
 * @test-file   session api
 * @description Covers listSessions/createSession/getSession/updateSession/deleteSession against a mocked fetch
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { listSessions, createSession, getSession, updateSession, deleteSession } from "@/lib/api/session";

function mockFetchOnce(body: unknown, init: Partial<Response> = {}) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    ...init,
  });
}

/**
 * @test-suite  session api
 * @target      apps/mobile/src/lib/api/session.ts
 * @strategy    unit, globalThis.fetch mocked
 * @cases
 *   - [PASS] listSessions maps raw sessions to ChatSession with numeric timestamps
 *   - [FAIL] listSessions throws on non-ok response
 *   - [PASS] createSession posts input and returns the created session
 *   - [PASS] getSession returns null on 404
 *   - [PASS] getSession includes parsed messages
 *   - [PASS] updateSession sends a PATCH with the given input
 *   - [PASS] deleteSession issues a DELETE and treats 404 as success
 *   - [FAIL] deleteSession throws on other failures
 */
describe("session api", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it("listSessions maps raw sessions to ChatSession with numeric timestamps", async () => {
    mockFetchOnce([
      { id: "s1", title: "Hi", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
    ]);

    const sessions = await listSessions();

    expect(globalThis.fetch).toHaveBeenCalledWith("http://test.local/api/sessions");
    expect(sessions).toEqual([
      {
        id: "s1",
        title: "Hi",
        messages: [],
        createdAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
        updatedAt: new Date("2026-01-02T00:00:00.000Z").getTime(),
      },
    ]);
  });

  it("listSessions throws on non-ok response", async () => {
    mockFetchOnce(null, { ok: false, status: 500 });
    await expect(listSessions()).rejects.toThrow("500");
  });

  it("createSession posts input and returns the created session", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    mockFetchOnce(
      { id, title: "New Chat", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { status: 201 },
    );

    const session = await createSession({ id });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://test.local/api/sessions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(session.id).toBe(id);
  });

  it("getSession returns null on 404", async () => {
    mockFetchOnce(null, { ok: false, status: 404 });
    expect(await getSession("missing")).toBeNull();
  });

  it("getSession includes parsed messages", async () => {
    mockFetchOnce({
      id: "s3",
      title: "Hi",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      messages: [{ role: "user", content: "hello" }],
    });

    const session = await getSession("s3");

    expect(session?.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("updateSession sends a PATCH with the given input", async () => {
    mockFetchOnce({
      id: "s1",
      title: "Renamed",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const session = await updateSession("s1", { title: "Renamed" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://test.local/api/sessions/s1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ title: "Renamed" }) }),
    );
    expect(session.title).toBe("Renamed");
  });

  it("deleteSession issues a DELETE and treats 404 as success", async () => {
    mockFetchOnce(null, { ok: false, status: 404 });
    await expect(deleteSession("gone")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith("http://test.local/api/sessions/gone", { method: "DELETE" });
  });

  it("deleteSession throws on other failures", async () => {
    mockFetchOnce(null, { ok: false, status: 500 });
    await expect(deleteSession("s1")).rejects.toThrow("500");
  });
});
