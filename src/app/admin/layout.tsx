import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth/require-admin";
import { AuthError } from "@/lib/server/auth/errors";
import { SIGN_IN_PATH } from "@/lib/server/route-policy";
import { PageShell } from "@/components/layout/PageShell";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError && error.status === 403) {
      return (
        <AdminShell>
          <PageShell className="max-w-(--container-app-readable) space-y-2">
            <h1 className="text-app-title">Access denied</h1>
            <p className="text-app-muted">Your account does not have permission to access the admin site.</p>
          </PageShell>
        </AdminShell>
      );
    }
    if (error instanceof AuthError) redirect(SIGN_IN_PATH);
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}
