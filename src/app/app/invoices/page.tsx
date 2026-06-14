"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { crm } from "@/lib/crm/repo";
import type { Invoice } from "@/lib/crm/types";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { LifecycleStepper } from "@/components/crm/LifecycleStepper";
import { cn, formatGBP } from "@/lib/utils";

// Invoices — the last mile: get paid. Overdue invoices are highlighted so the
// owner can chase the money that's actually late.

function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === "paid") return false;
  if (invoice.status === "overdue") return true;
  if (!invoice.due_at) return false;
  return new Date(invoice.due_at).getTime() < Date.now();
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    crm.invoices().then((rows) => {
      if (!active) return;
      setInvoices(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + i.total, 0),
    [invoices],
  );

  async function markPaid(invoice: Invoice) {
    setBusyId(invoice.id);
    const ok = await crm.update("invoice", invoice.id, {
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (ok) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? { ...i, status: "paid", paid_at: new Date().toISOString() }
            : i,
        ),
      );
    }
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Invoices</h1>
            <p className="mt-1 text-muted-foreground">
              Get paid for the work you&apos;ve done. Chase anything overdue first.
            </p>
          </div>
          {outstanding > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-display text-xl font-semibold text-foreground">
                {formatGBP(outstanding)}
              </p>
            </div>
          )}
        </div>
        <LifecycleStepper current="invoice" />
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading invoices…
        </p>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="When a job is completed, raise an invoice and it'll appear here. Mark it paid the moment the money lands."
        />
      ) : (
        <ul className="space-y-3">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <InvoiceRow invoice={invoice} busy={busyId === invoice.id} onPaid={markPaid} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  busy,
  onPaid,
}: {
  invoice: Invoice;
  busy: boolean;
  onPaid: (invoice: Invoice) => void;
}) {
  const overdue = isOverdue(invoice);
  const paid = invoice.status === "paid";
  return (
    <Card className={cn(overdue && "border-danger/50 bg-danger/5")}>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold text-foreground">
              {formatGBP(invoice.total)}
            </p>
            <InvoiceStatusBadge invoice={invoice} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {paid
              ? `Paid ${formatDate(invoice.paid_at)}`
              : invoice.due_at
                ? `Due ${formatDate(invoice.due_at)}`
                : "No due date set"}
          </p>
        </div>
        {!paid && (
          <Button size="sm" disabled={busy} onClick={() => onPaid(invoice)}>
            <Check className="h-4 w-4" aria-hidden /> Mark paid
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  if (isOverdue(invoice)) {
    return (
      <Badge tone="danger">
        <AlertTriangle className="mr-1 h-3 w-3" aria-hidden /> Overdue
      </Badge>
    );
  }
  const tone =
    invoice.status === "paid" ? "success" : invoice.status === "sent" ? "primary" : "muted";
  return (
    <Badge tone={tone} className="capitalize">
      {invoice.status}
    </Badge>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
