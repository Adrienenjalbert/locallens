import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { humanize } from "@/lib/format";
import { type PortfolioProject } from "@/lib/portfolio/projects";

/**
 * A style/ideas gallery: every project tagged with `style`, aggregated across
 * all businesses. This is the cross-pro surface — supply-side portfolio content
 * becomes demand-side inspiration that links out to each project and its
 * business, deepening the internal-link graph with zero extra authoring.
 */
export function IdeasGalleryView({
  style,
  projects,
}: {
  style: string;
  projects: PortfolioProject[];
}) {
  const styleLabel = humanize(style);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {styleLabel} garden ideas
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Real {styleLabel.toLowerCase()} garden projects completed by verified local pros,
          with before-and-after photos and honest reviews. Browse the work, then go
          straight to the team that did it.
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="text-muted-foreground">No projects in this style yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={`${p.business}-${p.slug}`}>
              <ProjectCard
                project={p}
                subtitle={`${humanize(p.business)} · ${p.locationName}`}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
