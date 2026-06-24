import { ProjectBuilder } from "@/components/portfolio/ProjectBuilder";

// Owner self-serve portfolio builder. The /app layout wraps this in AppShell.
// Statically exported; the builder works fully client-side (live preview + social
// pack) and writes to Supabase under RLS when an account is connected, falling
// back to a confirmed preview otherwise. `businessId` comes from the claimed
// business in production.
export default function PortfolioBuilderPage() {
  return <ProjectBuilder />;
}
