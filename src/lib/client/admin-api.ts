import { type CreateUserInput, type UpdatePasswordInput } from "../shared/schemas/user";

export async function createUser(input: CreateUserInput): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Failed to create user (${res.status})`);
  }
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Failed to delete user (${res.status})`);
  }
}

export async function updateUserPassword(id: string, input: UpdatePasswordInput): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Failed to update password (${res.status})`);
  }
}

export async function deleteAdminDocument(id: string): Promise<void> {
  const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Failed to delete document (${res.status})`);
  }
}
