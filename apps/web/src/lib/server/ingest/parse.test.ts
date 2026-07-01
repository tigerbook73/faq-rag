/// <reference types="jest" />
import { parseFile, mimeFromExt } from "./parse";
import fs from "fs/promises";

jest.mock("fs/promises");
jest.mock("pdf-parse", () => ({
  __esModule: true,
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: "extracted pdf text" }),
  })),
}));
jest.mock("mammoth", () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn().mockResolvedValue({ value: "extracted docx text", messages: [] }),
  },
}));

const mockedReadFile = jest.mocked(fs.readFile);

describe("parseFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads .md files as utf-8 string", async () => {
    mockedReadFile.mockResolvedValue("# Heading" as never);
    const result = await parseFile("/tmp/doc.md");
    expect(result).toBe("# Heading");
    expect(mockedReadFile).toHaveBeenCalledWith("/tmp/doc.md", "utf-8");
  });

  it("reads .txt files as utf-8 string", async () => {
    mockedReadFile.mockResolvedValue("plain text" as never);
    const result = await parseFile("/tmp/notes.txt");
    expect(result).toBe("plain text");
    expect(mockedReadFile).toHaveBeenCalledWith("/tmp/notes.txt", "utf-8");
  });

  it("parses .pdf files and returns extracted text", async () => {
    mockedReadFile.mockResolvedValue(Buffer.from("pdf bytes") as never);
    const { PDFParse } = await import("pdf-parse");
    const result = await parseFile("/tmp/report.pdf");
    expect(PDFParse).toHaveBeenCalledWith({ data: Buffer.from("pdf bytes") });
    expect(result).toBe("extracted pdf text");
  });

  it("parses .docx files and returns extracted value", async () => {
    const { default: mammoth } = await import("mammoth");
    const result = await parseFile("/tmp/doc.docx");
    expect(mammoth.extractRawText).toHaveBeenCalledWith({
      path: "/tmp/doc.docx",
    });
    expect(result).toBe("extracted docx text");
  });

  it("throws for unsupported extensions", async () => {
    await expect(parseFile("/tmp/file.xlsx")).rejects.toThrow("Unsupported file type: .xlsx");
  });

  it("handles uppercase extensions correctly", async () => {
    mockedReadFile.mockResolvedValue("content" as never);
    const result = await parseFile("/tmp/doc.MD");
    expect(result).toBe("content");
  });
});

describe("mimeFromExt", () => {
  it.each([
    [".md", "text/markdown"],
    [".txt", "text/plain"],
    [".pdf", "application/pdf"],
    [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    [".xyz", "application/octet-stream"],
  ])("%s → %s", (ext, expected) => {
    expect(mimeFromExt(ext)).toBe(expected);
  });
});
