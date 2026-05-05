import { AuthError } from "./errors";
import { requireUser } from "./require-user";

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError("Admin privileges required", 403);
  }
  return user;
}
