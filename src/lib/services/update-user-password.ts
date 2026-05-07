import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function updateUserPassword(userId: string, password: string): Promise<{ found: boolean }> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not found") || msg.includes("no rows")) {
      return { found: false };
    }
    throw new Error(error.message);
  }

  return { found: true };
}
