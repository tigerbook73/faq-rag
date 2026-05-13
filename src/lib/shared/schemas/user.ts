import { z } from "zod";

export const CreateUserInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const UpdatePasswordInputSchema = z.object({
  password: z.string().min(6),
});
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordInputSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

// GET /api/admin/users
export const AdminUserItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["user", "admin"]),
  createdAt: z.union([z.string(), z.date()]),
});
export type AdminUserItem = z.infer<typeof AdminUserItemSchema>;

// GET /api/auth/me
export const AuthMeResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: z.enum(["user", "admin"]),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
