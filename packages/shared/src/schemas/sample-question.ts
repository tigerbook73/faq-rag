import { z } from "zod";

export const SampleQuestionItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  question: z.string(),
});
export type SampleQuestionItem = z.infer<typeof SampleQuestionItemSchema>;
