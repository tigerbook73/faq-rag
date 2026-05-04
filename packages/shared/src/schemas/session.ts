import { z } from "zod";

export const CitationSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  documentName: z.string(),
  chunkId: z.string(),
  preview: z.string(),
  score: z.number(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  citations: z.array(CitationSchema).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const SessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const CreateSessionInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(100).optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

const UpdateSessionMessageInputSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(32000),
  citations: z.preprocess((v) => (Array.isArray(v) ? v : undefined), z.array(CitationSchema).optional()),
});

export const UpdateSessionInputSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  messages: z.array(UpdateSessionMessageInputSchema).optional(),
});
export type UpdateSessionInput = z.infer<typeof UpdateSessionInputSchema>;
