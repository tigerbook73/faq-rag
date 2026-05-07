import { AuthError } from "./errors";
import { getCurrentUser } from "./get-current-user";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  return user;
}
