"use client";

import { OwnerDashboard } from "@/components/app/OwnerDashboard";

// Owner profile surface. The /app layout already wraps children in AppShell,
// so this route just renders the dashboard. Statically exported; the dashboard
// loads its data client-side under RLS (and degrades gracefully without a
// backend). `businessId` is omitted here — in production it comes from the
// owner's claimed business looked up via auth; the dashboard falls back to
// demo signals so the surface is always meaningful.
export default function OwnerProfilePage() {
  return <OwnerDashboard />;
}
