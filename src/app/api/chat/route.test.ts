const mockRetrieve = jest.fn();
const mockChat = jest.fn();

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
    mockRetrieve.mockResolvedValue([]);
    mockChat.mockReturnValue(emptyChatStream());
  });

  it("calls retrieve with the question and returns SSE stream", async () => {
    const res = await POST(
      jsonRequest({
        question: "What can I access?",
        provider: "openai",
        history: [],
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockRetrieve).toHaveBeenCalledTimes(1);
    expect(mockRetrieve.mock.calls[0][0]).toBe("What can I access?");
    expect(mockRetrieve.mock.calls[0][1]).toEqual({
      traceId: expect.any(String),
      provider: "openai",
    });
  });

  it("returns 400 for invalid request body", async () => {
    const res = await POST(jsonRequest({}) as never);
    expect(res.status).toBe(400);
  });
});
