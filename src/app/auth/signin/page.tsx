import { Suspense } from "react";
import { redirect } from "next/navigation";
import { sanitizeRedirectPath } from "@/lib/route-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { from } = await searchParams;
    redirect(sanitizeRedirectPath(Array.isArray(from) ? from[0] : from));
  }

  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
