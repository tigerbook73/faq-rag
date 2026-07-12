const mockListSampleQuestions = jest.fn();

jest.mock("@/lib/server/data/sample-questions", () => ({
  listSampleQuestions: (...args: unknown[]) => mockListSampleQuestions(...args),
}));

import { GET } from "./route";

describe("/api/sample-questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the sample question pool", async () => {
    mockListSampleQuestions.mockResolvedValue([{ id: "q-1", documentId: "doc-1", question: "What is NestJS?" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [{ id: "q-1", documentId: "doc-1", question: "What is NestJS?" }],
    });
  });
});
