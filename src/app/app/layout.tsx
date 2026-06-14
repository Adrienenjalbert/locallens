import { AppShell } from "@/components/app/AppShell";

// Owner workspace layout. Every /app/* route renders inside the lifecycle-spine
// shell. Routes are statically exported; data loads client-side under RLS.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
