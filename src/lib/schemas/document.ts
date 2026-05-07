import { z } from "zod";

export const DocumentListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;

export const AdminDocumentListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});
export type AdminDocumentListQuery = z.infer<typeof AdminDocumentListQuerySchema>;

export const UpdateDocumentInputSchema = z.object({
  visibility: z.enum(["private", "public"]),
});
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;

export const PrepareUploadInputSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().positive(),
  mime: z.string(),
  hash: z.string().length(64),
});
export type PrepareUploadInput = z.infer<typeof PrepareUploadInputSchema>;
