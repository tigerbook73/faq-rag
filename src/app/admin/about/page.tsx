import { PageShell } from "@/components/layout/PageShell";

export default function AdminAboutPage() {
  return (
    <PageShell className="max-w-(--container-app-readable) space-y-6">
      <div className="space-y-2">
        <h1 className="text-app-title">Admin About</h1>
        <p className="text-app-muted">
          The admin site provides user and document oversight while keeping global management actions separate from the
          user workspace.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-app-section">Boundaries</h2>
        <p className="text-app-body">
          Admin routes require an authenticated account with the admin role. User workspace data remains scoped to the
          signed-in account, even when the account also has admin privileges.
        </p>
      </section>
    </PageShell>
  );
}
