import { cache } from "react";
import { prisma } from "@/lib/server/db/client";
import { createSupabaseServerClient } from "@/lib/server/supabase/server";
import { AuthError } from "./errors";

export const getProfile = cache(async (userId: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    throw new AuthError("Authenticated user does not have a business profile", 403);
  }

  return profile;
});

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return getProfile(user.id);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError("Admin privileges required", 403);
  }
  return user;
}
