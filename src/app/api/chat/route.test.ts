const mockRequireUser = jest.fn();
const mockRetrieve = jest.fn();
const mockChat = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/retrieval/query", () => ({
  retrieve: (...args: unknown[]) => mockRetrieve(...args),
}));

jest.mock("@/lib/server/llm/router", () => ({
  getProvider: () => ({
    chat: (...args: unknown[]) => mockChat(...args),
  }),
}));

import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function* emptyChatStream() {
  yield "";
}

describe("/api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-2", role: "user" });
    mockRetrieve.mockResolvedValue([]);
    mockChat.mockReturnValue(emptyChatStream());
  });

  it("passes the current user into retrieval", async () => {
    const res = await POST(
      jsonRequest({
        question: "What can I access?",
        provider: "openai",
        history: [],
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledTimes(1);
    expect(mockRetrieve).toHaveBeenCalledTimes(1);
    expect(mockRetrieve.mock.calls[0][0]).toBe("What can I access?");
    expect(mockRetrieve.mock.calls[0][1]).toEqual({
      userId: "user-2",
      traceId: expect.any(String),
      provider: "openai",
    });
  });
});
