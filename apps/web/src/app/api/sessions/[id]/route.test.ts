const mockGetSession = jest.fn();
const mockUpsertSession = jest.fn();
const mockDeleteSession = jest.fn();

jest.mock("@/lib/server/data/sessions", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  upsertSession: (...args: unknown[]) => mockUpsertSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
}));

import { DELETE, GET, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "session-1" }) };

function jsonRequest(body: unknown, method = "PATCH") {
  return new Request("http://localhost/api/sessions/session-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/sessions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns the session", async () => {
    mockGetSession.mockResolvedValue({ id: "session-1", messages: [] });

    const res = await GET(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith("session-1");
    expect(await res.json()).toEqual({ id: "session-1", messages: [] });
  });

  it("GET returns 404 when session does not exist", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("PATCH updates the session title", async () => {
    mockUpsertSession.mockResolvedValue({ id: "session-1", title: "New Title", messages: [] });

    const res = await PATCH(jsonRequest({ title: "New Title" }) as never, params);

    expect(res.status).toBe(200);
    expect(mockUpsertSession).toHaveBeenCalledWith("session-1", { title: "New Title" });
  });

  it("PATCH returns 404 when session does not exist", async () => {
    mockUpsertSession.mockResolvedValue(null);

    const res = await PATCH(jsonRequest({ title: "Ghost" }) as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("DELETE removes the session and returns 204", async () => {
    const res = await DELETE(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockDeleteSession).toHaveBeenCalledWith("session-1");
  });
});
