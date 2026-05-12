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

// ── Response DTOs ─────────────────────────────────────────────────────────────

// GET /api/documents
export const DocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string().nullable(),
  status: z.enum(["pending", "uploaded", "indexing", "indexed", "failed"]),
  visibility: z.enum(["private", "public"]),
  sizeBytes: z.number(),
  errorMsg: z.string().nullable(),
  totalChunks: z.number().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  _count: z.object({ chunks: z.number() }),
});
export type DocumentItem = z.infer<typeof DocumentItemSchema>;

// POST /api/documents/prepare
export const PrepareUploadOutputSchema = z.object({
  docId: z.string(),
  signedUrl: z.string(),
  token: z.string(),
  document: DocumentItemSchema,
});
export type PrepareUploadOutput = z.infer<typeof PrepareUploadOutputSchema>;

// GET /api/admin/documents
export const AdminDocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUserId: z.string(),
  status: z.string(),
  visibility: z.enum(["private", "public"]),
  owner: z.object({ email: z.string() }),
  _count: z.object({ chunks: z.number(), selections: z.number() }),
  createdAt: z.union([z.string(), z.date()]),
});
export type AdminDocumentItem = z.infer<typeof AdminDocumentItemSchema>;

// GET /api/public-documents
export const PublicDocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string().nullable(),
  status: z.string(),
  selected: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  owner: z.object({ email: z.string() }),
  _count: z.object({ chunks: z.number() }),
});
export type PublicDocumentItem = z.infer<typeof PublicDocumentItemSchema>;
