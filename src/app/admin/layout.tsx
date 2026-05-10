import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AuthError } from "@/lib/auth/errors";
import { ADMIN_ACCESS_DENIED_PATH } from "@/lib/route-policy";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) redirect(ADMIN_ACCESS_DENIED_PATH);
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}
