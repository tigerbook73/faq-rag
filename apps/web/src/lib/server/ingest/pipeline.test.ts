/**
 * @test-file   parseAndSplitDocument
 * @description Validates embeddingModel gets synced to the active model on every parse+split run
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */

const mockUpdate = jest.fn();
const mockDeleteMany = jest.fn();
const mockTransaction = jest.fn();
const mockExecuteRaw = jest.fn();
const mockSetDocumentFailed = jest.fn();
const mockGetEmbeddingModelId = jest.fn();
const mockReadUploadedFile = jest.fn();
const mockParseBuffer = jest.fn();
const mockSplitText = jest.fn();
const mockSplitTextMarkdown = jest.fn();

jest.mock("../db/client", () => ({
  prisma: {
    document: { update: (...args: unknown[]) => mockUpdate(...args) },
    chunk: { deleteMany: (...args: unknown[]) => mockDeleteMany(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}));

jest.mock("../data/documents", () => ({
  findDuplicateDocument: jest.fn(),
  setDocumentFailed: (...args: unknown[]) => mockSetDocumentFailed(...args),
}));

jest.mock("./parse", () => ({
  parseFile: jest.fn(),
  parseBuffer: (...args: unknown[]) => mockParseBuffer(...args),
  mimeFromExt: jest.fn(),
}));

jest.mock("./split", () => ({
  splitText: (...args: unknown[]) => mockSplitText(...args),
  splitTextMarkdown: (...args: unknown[]) => mockSplitTextMarkdown(...args),
}));

jest.mock("../embeddings/router", () => ({
  embedBatchForIndexing: jest.fn(),
  getEmbeddingModelId: () => mockGetEmbeddingModelId(),
}));

jest.mock("../lang/detect", () => ({
  detectLang: jest.fn().mockReturnValue("en"),
}));

jest.mock("../storage", () => ({
  readUploadedFile: (...args: unknown[]) => mockReadUploadedFile(...args),
}));

jest.mock("../logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { parseAndSplitDocument } from "./pipeline";

/**
 * @test-suite  parseAndSplitDocument
 * @target      apps/web/src/lib/server/ingest/pipeline.ts
 * @strategy    unit, mocks prisma/storage/parse/split/embeddings modules
 * @cases
 *   - [PASS] syncs document.embeddingModel to the current active model when parsing starts
 *   - [FAIL] marks the document failed and rethrows when parsing fails
 */
describe("parseAndSplitDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddingModelId.mockReturnValue("bge-m3");
    mockReadUploadedFile.mockResolvedValue(Buffer.from("file bytes"));
    mockParseBuffer.mockResolvedValue("parsed text");
    mockSplitText.mockResolvedValue(["chunk one", "chunk two"]);
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockTransaction.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("syncs document.embeddingModel to the current active model when parsing starts", async () => {
    await parseAndSplitDocument("doc-1", "embed/doc-1/notes.txt");

    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "doc-1" },
      data: { status: "indexing", errorMsg: null, embeddingModel: "bge-m3" },
    });
  });

  it("marks the document failed and rethrows when parsing fails", async () => {
    mockParseBuffer.mockRejectedValue(new Error("parse boom"));

    await expect(parseAndSplitDocument("doc-1", "embed/doc-1/notes.txt")).rejects.toThrow("parse boom");
    expect(mockSetDocumentFailed).toHaveBeenCalledWith("doc-1", "parse boom");
  });
});
