import { useQuery } from "@tanstack/react-query";
import { listSampleQuestions } from "@/lib/api/sample-question";
import { queryKeys } from "@/lib/query-keys";

export function useSampleQuestions() {
  const { data } = useQuery({
    queryKey: queryKeys.sampleQuestions.all,
    queryFn: () => listSampleQuestions(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return { questions: data ?? [] };
}
