import { AdminShell } from "@/components/admin/AdminShell";

// Admin area layout. Statically exported; data loads client-side and is
// RLS-gated to admins (is_admin()). Non-admins see the gate, not the data.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
