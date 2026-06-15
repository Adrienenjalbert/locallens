import { Card, CardBody, CardHeader } from "@/components/ui/primitives";

// Placeholder; the improvement-agent workstream builds the full control tower.
export default function AdminLoopPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Improvement loop
      </h1>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Control tower</p>
        </CardHeader>
        <CardBody>
          <p className="text-muted-foreground">
            RPM, rubrics, running experiments and recommendations appear here.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
