/**
 * @test-file   sample-question api
 * @description Covers listSampleQuestions against a mocked fetch
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { listSampleQuestions } from "@/lib/api/sample-question";

function mockFetchOnce(body: unknown, init: Partial<Response> = {}) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    ...init,
  });
}

/**
 * @test-suite  sample-question api
 * @target      apps/mobile/src/lib/api/sample-question.ts
 * @strategy    unit, globalThis.fetch mocked
 * @cases
 *   - [PASS] listSampleQuestions parses items from the response
 *   - [FAIL] listSampleQuestions throws on a non-2xx response
 */
describe("sample-question api", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it("listSampleQuestions parses items from the response", async () => {
    mockFetchOnce({ items: [{ id: "q-1", documentId: "doc-1", question: "What is NestJS?" }] });

    const result = await listSampleQuestions();

    expect(globalThis.fetch).toHaveBeenCalledWith("http://test.local/api/sample-questions");
    expect(result).toEqual([{ id: "q-1", documentId: "doc-1", question: "What is NestJS?" }]);
  });

  it("listSampleQuestions throws on a non-2xx response", async () => {
    mockFetchOnce({}, { ok: false, status: 500 });

    await expect(listSampleQuestions()).rejects.toThrow("Failed to list sample questions: 500");
  });
});
