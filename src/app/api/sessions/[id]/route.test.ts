const mockRequireUser = jest.fn();
const mockGetSessionForUser = jest.fn();
const mockUpsertSessionForUser = jest.fn();
const mockDeleteSessionForUser = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/data/sessions", () => ({
  getSessionForUser: (...args: unknown[]) => mockGetSessionForUser(...args),
  upsertSessionForUser: (...args: unknown[]) => mockUpsertSessionForUser(...args),
  deleteSessionForUser: (...args: unknown[]) => mockDeleteSessionForUser(...args),
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
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
  });

  it("returns only sessions owned by the current user", async () => {
    mockGetSessionForUser.mockResolvedValue({ id: "session-1", userId: "user-1", messages: [] });

    const res = await GET(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(200);
    expect(mockGetSessionForUser).toHaveBeenCalledWith("user-1", "session-1");
    expect(await res.json()).toEqual({ id: "session-1", userId: "user-1", messages: [] });
  });

  it("returns 404 when the session is not owned by the current user", async () => {
    mockGetSessionForUser.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("does not patch a session owned by another user", async () => {
    mockUpsertSessionForUser.mockResolvedValue(null);

    const res = await PATCH(jsonRequest({ title: "Nope" }) as never, params);

    expect(res.status).toBe(404);
    expect(mockUpsertSessionForUser).toHaveBeenCalledWith("user-1", "session-1", { title: "Nope" });
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("deletes only the current user's session", async () => {
    mockDeleteSessionForUser.mockResolvedValue({ count: 1 });

    const res = await DELETE(new Request("http://localhost/api/sessions/session-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockDeleteSessionForUser).toHaveBeenCalledWith("user-1", "session-1");
  });
});
