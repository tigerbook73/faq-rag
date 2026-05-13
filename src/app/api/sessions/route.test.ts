const mockRequireUser = jest.fn();
const mockListSessionsForUser = jest.fn();
const mockCreateSessionForUser = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/data/sessions", () => ({
  listSessionsForUser: (...args: unknown[]) => mockListSessionsForUser(...args),
  createSessionForUser: (...args: unknown[]) => mockCreateSessionForUser(...args),
}));

import { GET, POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
  });

  it("lists sessions for the current user", async () => {
    mockListSessionsForUser.mockResolvedValue([{ id: "session-1", title: "Mine" }]);

    const res = await GET(new Request("http://localhost/api/sessions") as never);

    expect(res.status).toBe(200);
    expect(mockListSessionsForUser).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual([{ id: "session-1", title: "Mine" }]);
  });

  it("creates a session owned by the current user", async () => {
    const body = { id: "11111111-1111-4111-8111-111111111111", title: "New" };
    mockCreateSessionForUser.mockResolvedValue({ ...body, userId: "user-1" });

    const res = await POST(jsonRequest(body) as never);

    expect(res.status).toBe(201);
    expect(mockCreateSessionForUser).toHaveBeenCalledWith("user-1", body);
    expect(await res.json()).toEqual({ ...body, userId: "user-1" });
  });
});
