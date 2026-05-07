import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AuthError } from "@/lib/auth/errors";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) redirect("/chat/new");
    throw error;
  }
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
