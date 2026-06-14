"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Users,
  FileText,
  CalendarDays,
  Receipt,
  Settings,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Owner workspace shell. Left nav follows the job lifecycle spine
// (Lead → Quote → Job → Invoice). Mobile-first: nav collapses to a bottom bar.
const NAV = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/leads", label: "Leads", icon: Inbox },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/quotes", label: "Quotes", icon: FileText },
  { href: "/app/jobs", label: "Jobs", icon: CalendarDays },
  { href: "/app/invoices", label: "Invoices", icon: Receipt },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-card p-4 md:block">
        <Link href="/app" className="font-display text-lg font-semibold text-foreground">
          LocalLens
        </Link>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav (thumb-friendly) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-card py-2 md:hidden">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 text-xs",
              isActive(pathname, href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(href);
}
