import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/helpers";
import { resolvePostLoginRedirect } from "@/lib/route-policy";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  const fromParam = Array.isArray(from) ? from[0] : from;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
  }

  if (user) {
    redirect(resolvePostLoginRedirect(user.role, fromParam));
  }

  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
