/**
 * @test-file   useSampleQuestions
 * @description Covers useSampleQuestions' initial empty state, data arrival, and staleTime: Infinity caching
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { waitFor } from "@testing-library/react-native";
import type { SampleQuestionItem } from "@faq-rag/shared";
import { useSampleQuestions } from "@/hooks/useSampleQuestions";
import { createTestQueryClient, renderHookWithClient } from "@/test/react-query";
import { listSampleQuestions } from "@/lib/api/sample-question";

jest.mock("@/lib/api/sample-question", () => ({ listSampleQuestions: jest.fn() }));

const QUESTIONS: SampleQuestionItem[] = [{ id: "q1", documentId: "d1", question: "What is this?" }];

/**
 * @test-suite  useSampleQuestions
 * @target      apps/mobile/src/hooks/useSampleQuestions.ts
 * @strategy    renderHook + real QueryClient, @/lib/api/sample-question mocked
 * @cases
 *   - [PASS] returns an empty array before the query resolves
 *   - [PASS] returns the fetched questions once the query resolves
 *   - [PASS] staleTime: Infinity means a second render on the same client does not refetch
 */
describe("useSampleQuestions", () => {
  beforeEach(() => {
    (listSampleQuestions as jest.Mock).mockReset();
  });

  it("returns an empty array before the query resolves", () => {
    (listSampleQuestions as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderHookWithClient(useSampleQuestions);

    expect(result.current.questions).toEqual([]);
  });

  it("returns the fetched questions once the query resolves", async () => {
    (listSampleQuestions as jest.Mock).mockResolvedValue(QUESTIONS);

    const { result } = renderHookWithClient(useSampleQuestions);

    await waitFor(() => expect(result.current.questions).toEqual(QUESTIONS));
  });

  it("staleTime: Infinity means a second render on the same client does not refetch", async () => {
    (listSampleQuestions as jest.Mock).mockResolvedValue(QUESTIONS);
    const client = createTestQueryClient();

    const first = renderHookWithClient(useSampleQuestions, { client });
    await waitFor(() => expect(first.result.current.questions).toEqual(QUESTIONS));

    renderHookWithClient(useSampleQuestions, { client });

    expect(listSampleQuestions).toHaveBeenCalledTimes(1);
  });
});
