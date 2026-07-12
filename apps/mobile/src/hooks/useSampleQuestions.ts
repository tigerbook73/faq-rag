import useSWR from "swr";
import { listSampleQuestions } from "@/lib/api/sample-question";

const SWR_KEY = "/api/sample-questions";

export function useSampleQuestions() {
  const { data } = useSWR(SWR_KEY, () => listSampleQuestions(), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  return { questions: data ?? [] };
}
