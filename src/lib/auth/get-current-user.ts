import { cache } from "react";
import { prisma } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthError } from "./errors";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    throw new AuthError("Authenticated user does not have a business profile", 403);
  }

  return profile;
});
