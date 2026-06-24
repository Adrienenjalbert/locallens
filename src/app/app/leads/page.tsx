"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, FileText, Check, X, UserPlus } from "lucide-react";
import { crm } from "@/lib/crm/repo";
import { speedToLeadHours, type Lead } from "@/lib/crm/types";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { LifecycleStepper } from "@/components/crm/LifecycleStepper";

// Leads inbox — the first surface of the lifecycle. Leads land here from the
// directory profile + tools. The headline job is speed-to-lead: respond fast.

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    crm.leads().then((rows) => {
      if (!active) return;
      setLeads(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function setStatus(lead: Lead, status: Lead["status"]) {
    setBusyId(lead.id);
    const ok = await crm.updateLeadStatus(lead.id, status);
    if (ok) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                status,
                first_response_at:
                  status !== "new" && !l.first_response_at
                    ? new Date().toISOString()
                    : l.first_response_at,
              }
            : l,
        ),
      );
    }
    setBusyId(null);
  }

  async function convertToCustomer(lead: Lead) {
    setBusyId(lead.id);
    await crm.createCustomerFromLead(lead);
    if (lead.status === "new") {
      await crm.updateLeadStatus(lead.id, "won");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                status: "won",
                first_response_at: l.first_response_at ?? new Date().toISOString(),
              }
            : l,
        ),
      );
    }
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            New enquiries from your directory profile and tools. Respond fast — speed wins
            jobs.
          </p>
        </div>
        <LifecycleStepper current="lead" />
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading leads…
        </p>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="When someone enquires through your directory profile or one of your tools, their message lands here. Keep your profile sharp so leads keep coming."
          action={
            <Link href="/app/profile">
              <Button variant="secondary">Polish your profile</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <LeadRow
                lead={lead}
                busy={busyId === lead.id}
                onStatus={setStatus}
                onConvert={convertToCustomer}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  busy,
  onStatus,
  onConvert,
}: {
  lead: Lead;
  busy: boolean;
  onStatus: (lead: Lead, status: Lead["status"]) => void;
  onConvert: (lead: Lead) => void;
}) {
  const name = lead.contact_name ?? "Unknown contact";
  const hours = speedToLeadHours(lead);
  const overdue = !lead.first_response_at && hours > 1;
  const settled = lead.status === "won" || lead.status === "lost";

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {lead.source ?? "Direct"}
              {lead.attributed_page ? ` · ${lead.attributed_page}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={lead.status} />
            <Badge
              tone={overdue ? "danger" : lead.first_response_at ? "success" : "muted"}
            >
              {lead.first_response_at ? "Responded" : `${formatHours(hours)} waiting`}
            </Badge>
          </div>
        </div>

        {lead.message && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{lead.message}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {lead.contact_phone && (
            <a href={`tel:${lead.contact_phone}`} className="contents">
              <Button size="sm" variant="secondary">
                <Phone className="h-4 w-4" aria-hidden /> Call
              </Button>
            </a>
          )}
          {lead.contact_phone && (
            <a
              href={`https://wa.me/${lead.contact_phone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contents"
            >
              <Button size="sm" variant="secondary">
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </Button>
            </a>
          )}
          <Link href={`/app/quotes?lead=${lead.id}`} className="contents">
            <Button size="sm">
              <FileText className="h-4 w-4" aria-hidden /> Quote
            </Button>
          </Link>
          {!settled && (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onStatus(lead, "won")}
              >
                <Check className="h-4 w-4" aria-hidden /> Won
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onStatus(lead, "lost")}
              >
                <X className="h-4 w-4" aria-hidden /> Lost
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onConvert(lead)}
          >
            <UserPlus className="h-4 w-4" aria-hidden /> Convert to customer
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: Lead["status"] }) {
  const tone =
    status === "won"
      ? "success"
      : status === "lost"
        ? "danger"
        : status === "quoted"
          ? "primary"
          : "muted";
  return (
    <Badge tone={tone} className="capitalize">
      {status}
    </Badge>
  );
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
