import { Card, CardBody, CardHeader } from "@/components/ui/primitives";

// Overview / home of the owner workspace. Subagents flesh out the lifecycle
// surfaces; this gives the route a useful landing with the lifecycle spine.
export default function AppOverviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Your business at a glance
        </h1>
        <p className="mt-1 text-muted-foreground">
          Leads come in from your directory profile and tools, then flow through your day:
          quote → job → invoice → paid.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "New leads", value: "—", href: "/app/leads" },
          { label: "Jobs this week", value: "—", href: "/app/jobs" },
          { label: "Awaiting payment", value: "—", href: "/app/invoices" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardHeader>
            <CardBody>
              <p className="font-display text-3xl font-semibold text-foreground">
                {s.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
