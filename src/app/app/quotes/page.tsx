"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { crm } from "@/lib/crm/repo";
import { lineItemsTotal, type LineItem, type Quote } from "@/lib/crm/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
} from "@/components/ui/primitives";
import { LifecycleStepper } from "@/components/crm/LifecycleStepper";
import { formatGBP } from "@/lib/utils";

// Quotes — turn a lead into a priced proposal. The inline builder keeps a live
// total via lineItemsTotal so the owner can quote on the spot from their phone.

type DraftItem = { description: string; quantity: string; unit_price: string };

const emptyItem = (): DraftItem => ({ description: "", quantity: "1", unit_price: "" });

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  useEffect(() => {
    let active = true;
    crm.quotes().then((rows) => {
      if (!active) return;
      setQuotes(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Reading the lead param from the URL directly avoids a Suspense boundary
  // requirement under static export (useSearchParams would force one).
  useEffect(() => {
    const lead = new URLSearchParams(window.location.search).get("lead");
    if (lead) {
      setLeadId(lead);
      setBuilding(true);
    }
  }, []);

  function toLineItems(): LineItem[] {
    return items
      .filter((i) => i.description.trim() !== "")
      .map((i) => ({
        description: i.description.trim(),
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
      }));
  }

  const draftTotal = lineItemsTotal(toLineItems());

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function resetBuilder() {
    setItems([emptyItem()]);
    setLeadId(null);
    setBuilding(false);
  }

  async function saveQuote() {
    const lineItems = toLineItems();
    if (lineItems.length === 0) return;
    setSaving(true);
    const created = await crm.insert<Quote>("quote", {
      lead_id: leadId,
      line_items: lineItems,
      total: lineItemsTotal(lineItems),
      status: "draft",
    });
    if (created) setQuotes((prev) => [created, ...prev]);
    setSaving(false);
    resetBuilder();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Quotes</h1>
            <p className="mt-1 text-muted-foreground">
              Price the job and send it while you have their attention.
            </p>
          </div>
          {!building && (
            <Button size="sm" onClick={() => setBuilding(true)}>
              <Plus className="h-4 w-4" aria-hidden /> New quote
            </Button>
          )}
        </div>
        <LifecycleStepper current="quote" />
      </header>

      {building && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">New quote</h2>
              {leadId && <Badge tone="primary">From lead</Badge>}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Input
                    aria-label="Description"
                    placeholder="Description (e.g. Lawn mowing)"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                  />
                  <Input
                    aria-label="Quantity"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="sm:w-20"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  />
                  <Input
                    aria-label="Unit price in pounds"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="sm:w-28"
                    placeholder="Unit £"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove line item"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add line item
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Total{" "}
                <span className="font-display text-xl font-semibold text-foreground">
                  {formatGBP(draftTotal)}
                </span>
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={resetBuilder} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={saveQuote} disabled={saving || draftTotal === 0}>
                  <Save className="h-4 w-4" aria-hidden /> {saving ? "Saving…" : "Save quote"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading quotes…
        </p>
      ) : quotes.length === 0 ? (
        !building && (
          <EmptyState
            title="No quotes yet"
            description="Create a quote from a lead or start a fresh one. Add line items and the total updates as you type."
            action={
              <Button onClick={() => setBuilding(true)}>
                <Plus className="h-4 w-4" aria-hidden /> New quote
              </Button>
            }
          />
        )
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <QuoteRow quote={quote} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  const itemCount = quote.line_items?.length ?? 0;
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {quote.line_items?.[0]?.description ?? "No line items"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuoteStatusBadge status={quote.status} />
          <p className="font-display text-lg font-semibold text-foreground">
            {formatGBP(quote.total)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function QuoteStatusBadge({ status }: { status: Quote["status"] }) {
  const tone =
    status === "accepted"
      ? "success"
      : status === "declined"
        ? "danger"
        : status === "sent" || status === "viewed"
          ? "primary"
          : "muted";
  return (
    <Badge tone={tone} className="capitalize">
      {status}
    </Badge>
  );
}
