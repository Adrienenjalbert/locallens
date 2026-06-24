import { cn } from "@/lib/utils";
import { QualityScoreBadge } from "@/components/directory/QualityScoreBadge";

/** One comparison criterion (a row). `render` lets a cell show rich content. */
export interface ComparatorCriterion<TBusiness> {
  /** Stable key, matches vertical.tools.comparator.criteria entries. */
  key: string;
  label: string;
  /** Renders the cell for a given business. */
  render: (business: TBusiness) => React.ReactNode;
  /** Optional one-line explanation shown under the row label. */
  hint?: string;
}

export interface ComparatorColumn {
  /** Stable identifier for the business (column). */
  id: string;
  name: string;
  /** Marks the column highlighted (e.g. the overall top pick). */
  highlight?: boolean;
}

/**
 * Responsive side-by-side comparison. On wide screens it is a real <table>
 * (criteria as rows, businesses as columns). On mobile it stacks into one
 * card per business with labelled rows. Accessible table semantics throughout;
 * `scope` is set on header cells for screen readers.
 */
export function ComparatorTable<TBusiness extends { id: string }>({
  columns,
  criteria,
  businesses,
  caption,
}: {
  columns: ComparatorColumn[];
  criteria: ComparatorCriterion<TBusiness>[];
  businesses: TBusiness[];
  caption: string;
}) {
  const byId = new Map(businesses.map((b) => [b.id, b]));

  return (
    <>
      {/* Wide screens: true table layout. */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b bg-muted/40">
              <th scope="col" className="p-3 text-left font-medium text-muted-foreground">
                Criteria
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "p-3 text-left font-display text-base font-semibold text-foreground",
                    col.highlight && "bg-primary/10",
                  )}
                >
                  {col.name}
                  {col.highlight && (
                    <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 align-middle text-xs font-medium text-primary">
                      Top pick
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion.key} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="p-3 text-left align-top font-medium text-foreground"
                >
                  {criterion.label}
                  {criterion.hint && (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {criterion.hint}
                    </span>
                  )}
                </th>
                {columns.map((col) => {
                  const business = byId.get(col.id);
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        "p-3 align-top text-foreground",
                        col.highlight && "bg-primary/5",
                      )}
                    >
                      {business ? criterion.render(business) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, one per business, labelled rows. */}
      <div className="space-y-4 md:hidden">
        {columns.map((col) => {
          const business = byId.get(col.id);
          return (
            <table
              key={col.id}
              className={cn(
                "w-full overflow-hidden rounded-lg border text-sm",
                col.highlight && "border-primary",
              )}
            >
              <caption className="sr-only">{`${caption} — ${col.name}`}</caption>
              <thead>
                <tr
                  className={cn("border-b bg-muted/40", col.highlight && "bg-primary/10")}
                >
                  <th scope="colgroup" colSpan={2} className="p-3 text-left">
                    <span className="font-display text-base font-semibold text-foreground">
                      {col.name}
                    </span>
                    {col.highlight && (
                      <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Top pick
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion) => (
                  <tr key={criterion.key} className="border-b last:border-b-0">
                    <th
                      scope="row"
                      className="w-2/5 p-3 text-left align-top font-medium text-muted-foreground"
                    >
                      {criterion.label}
                    </th>
                    <td className="p-3 align-top text-foreground">
                      {business ? criterion.render(business) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </>
  );
}

/** Convenience cell renderer matching the directory's Quality Score badge. */
export function QualityScoreCell({ score }: { score: number }) {
  return <QualityScoreBadge score={score} />;
}
