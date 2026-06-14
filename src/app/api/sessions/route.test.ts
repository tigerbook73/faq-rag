const mockListSessions = jest.fn();
const mockCreateSession = jest.fn();

jest.mock("@/lib/server/data/sessions", () => ({
  listSessions: (...args: unknown[]) => mockListSessions(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
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
  });

  it("lists sessions", async () => {
    mockListSessions.mockResolvedValue([{ id: "session-1", title: "Mine" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockListSessions).toHaveBeenCalledWith();
    expect(await res.json()).toEqual([{ id: "session-1", title: "Mine" }]);
  });

  it("creates a session", async () => {
    const body = { id: "11111111-1111-4111-8111-111111111111", title: "New" };
    mockCreateSession.mockResolvedValue(body);

    const res = await POST(jsonRequest(body) as never);

    expect(res.status).toBe(201);
    expect(mockCreateSession).toHaveBeenCalledWith(body);
    expect(await res.json()).toEqual(body);
  });
});
