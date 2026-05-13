import { createSupabaseServiceClient } from "@/lib/server/supabase/server";
import { createUserProfile } from "@/lib/server/data/users";

type CreateUserInput = {
  email: string;
  password: string;
  role?: "user" | "admin";
};

export async function createUserAccount(input: CreateUserInput) {
  const role = input.role ?? "user";
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role },
    app_metadata: { role },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`Supabase did not return a user for ${input.email}`);

  try {
    return await createUserProfile({
      id: data.user.id,
      email: input.email,
      role,
    });
  } catch (error) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw error;
  }
}
