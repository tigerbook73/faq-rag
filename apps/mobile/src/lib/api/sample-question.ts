import { SampleQuestionItemSchema, type SampleQuestionItem } from "@faq-rag/shared";
import { getApiUrl } from "./config";

export async function listSampleQuestions(): Promise<SampleQuestionItem[]> {
  const res = await fetch(`${getApiUrl()}/api/sample-questions`);
  if (!res.ok) throw new Error(`Failed to list sample questions: ${res.status}`);
  const data = await res.json();
  return (data.items as unknown[]).map((q) => SampleQuestionItemSchema.parse(q));
}
