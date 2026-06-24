import Link from "next/link";
import Image from "next/image";
import { projectPath, type PortfolioProject } from "@/lib/portfolio/projects";
import { cn } from "@/lib/utils";

// The single project "cover card" used everywhere a project is listed: the
// business hub grid, the location recent-work strip, the style galleries and the
// related-projects rail. One component → consistent markup + one place to tune.
export function ProjectCard({
  project,
  aspect = "video",
  subtitle,
  priority,
}: {
  project: PortfolioProject;
  /** "video" = 4:3 (default), "square" = 1:1 (tight grids). */
  aspect?: "video" | "square";
  /** Optional second line, e.g. "GreenThumb Gardens · Didsbury". */
  subtitle?: string;
  priority?: boolean;
}) {
  const cover = project.images.find((i) => i.after) ?? project.images[0];
  return (
    <Link
      href={projectPath(project)}
      className="group block overflow-hidden rounded-lg border bg-card transition hover:shadow-sm"
    >
      <div className={cn("relative", aspect === "square" ? "aspect-square" : "aspect-[4/3]")}>
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            unoptimized
            priority={priority}
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-3">
        <span className="line-clamp-1 block text-sm font-medium text-foreground group-hover:underline">
          {project.title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
    </Link>
  );
}
