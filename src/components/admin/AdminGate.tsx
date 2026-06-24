"use client";

import { useAuth } from "@/lib/auth/AuthProvider";

// Client-side admin gate. The REAL enforcement is RLS (is_admin() in 0006_rls)
// — admin tables return nothing to non-admins regardless of UI. This gate just
// avoids rendering the admin chrome for non-admins.
export function isAdmin(user: ReturnType<typeof useAuth>["user"]): boolean {
  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  return role === "admin";
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin(user)) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is restricted. Data is protected by row-level security regardless of
          this screen.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
