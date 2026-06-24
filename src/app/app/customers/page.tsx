"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { crm } from "@/lib/crm/repo";
import type { Customer } from "@/lib/crm/types";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { LifecycleStepper } from "@/components/crm/LifecycleStepper";
import { cn, formatGBP } from "@/lib/utils";

// Customers — won leads become repeat business. The lapsed filter surfaces
// win-back targets (a customer who hasn't booked in a while).

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lapsedOnly, setLapsedOnly] = useState(false);

  useEffect(() => {
    let active = true;
    crm.customers().then((rows) => {
      if (!active) return;
      setCustomers(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const lapsedCount = useMemo(
    () => customers.filter((c) => c.status === "lapsed").length,
    [customers],
  );
  const visible = useMemo(
    () => (lapsedOnly ? customers.filter((c) => c.status === "lapsed") : customers),
    [customers, lapsedOnly],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Customers
            </h1>
            <p className="mt-1 text-muted-foreground">
              Your book of business. Win lapsed customers back before they forget you.
            </p>
          </div>
          <Button
            variant={lapsedOnly ? "primary" : "secondary"}
            size="sm"
            aria-pressed={lapsedOnly}
            onClick={() => setLapsedOnly((v) => !v)}
          >
            Lapsed only{lapsedCount > 0 ? ` (${lapsedCount})` : ""}
          </Button>
        </div>
        <LifecycleStepper current="job" />
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading customers…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={lapsedOnly ? "No lapsed customers" : "No customers yet"}
          description={
            lapsedOnly
              ? "Nobody has lapsed — your retention is healthy. Switch the filter off to see everyone."
              : "Convert a won lead into a customer from the Leads inbox and they'll appear here with their lifetime value."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((customer) => (
            <li key={customer.id}>
              <CustomerRow customer={customer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const lapsed = customer.status === "lapsed";
  return (
    <Card className={cn(lapsed && "border-warning/40")}>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{customer.name}</p>
            <Badge tone={lapsed ? "warning" : "success"} className="capitalize">
              {customer.status}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {customer.phone ?? customer.email ?? "No contact details"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Lifetime value</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {formatGBP(customer.lifetime_value)}
            </p>
          </div>
          <div className="flex gap-1.5">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} aria-label={`Call ${customer.name}`}>
                <Button size="sm" variant="ghost">
                  <Phone className="h-4 w-4" aria-hidden />
                </Button>
              </a>
            )}
            {customer.phone && (
              <a
                href={`https://wa.me/${customer.phone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${customer.name}`}
              >
                <Button size="sm" variant="ghost">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </Button>
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} aria-label={`Email ${customer.name}`}>
                <Button size="sm" variant="ghost">
                  <Mail className="h-4 w-4" aria-hidden />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
