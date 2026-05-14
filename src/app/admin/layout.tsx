import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth/require-admin";
import { AuthError } from "@/lib/server/auth/errors";
import { SIGN_IN_PATH, ADMIN_ACCESS_DENIED_PATH } from "@/lib/server/route-policy";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError && error.status === 403) redirect(ADMIN_ACCESS_DENIED_PATH);
    if (error instanceof AuthError) redirect(SIGN_IN_PATH);
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}
