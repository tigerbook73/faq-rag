const mockFindMany = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    sampleQuestion: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { listSampleQuestions } from "./sample-questions";

describe("listSampleQuestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("only queries sample questions for indexed built-in documents", async () => {
    await listSampleQuestions();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { document: { isBuiltIn: true, status: "indexed" } },
      select: { id: true, documentId: true, question: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("dedupes questions with the same text across different documents", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", documentId: "doc-a", question: "What are NestJS pipes?" },
      { id: "2", documentId: "doc-b", question: "What are NestJS pipes?" },
      { id: "3", documentId: "doc-a", question: "What is dependency injection?" },
    ]);

    const result = await listSampleQuestions();

    expect(result).toEqual([
      { id: "1", documentId: "doc-a", question: "What are NestJS pipes?" },
      { id: "3", documentId: "doc-a", question: "What is dependency injection?" },
    ]);
  });
});
