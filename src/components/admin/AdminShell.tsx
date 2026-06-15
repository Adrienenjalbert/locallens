"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FlaskConical, ShieldCheck, Image as ImageIcon, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminGate } from "./AdminGate";

// Admin control-tower shell. The /admin layout wraps children in this.
const NAV = [
  { href: "/admin/loop", label: "Loop", icon: Activity },
  { href: "/admin/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/admin/data", label: "Data checks", icon: ShieldCheck },
  { href: "/admin/ui", label: "UI checks", icon: ImageIcon },
  { href: "/admin/prospects", label: "Prospects", icon: Target },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AdminGate>
      <div className="min-h-screen md:flex">
        <aside className="hidden w-52 shrink-0 border-r bg-card p-4 md:block">
          <Link href="/admin/loop" className="font-display text-base font-semibold">
            LocalLens · Admin
          </Link>
          <nav className="mt-6 space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                  pathname?.startsWith(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </AdminGate>
  );
}
