import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Quote, Star } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import {
  ideasPath,
  projectPath,
  relatedProjects,
  type PortfolioProject,
  type ProjectImage,
} from "@/lib/portfolio/projects";
import { buildSocialPack } from "@/lib/portfolio/social";
import { SocialPackPanel } from "@/components/portfolio/SocialPackPanel";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { humanize } from "@/lib/format";
import { siteUrl } from "@/lib/paths";

function ProjectImageTile({
  image,
  label,
  priority,
}: {
  image: ProjectImage;
  label?: string;
  priority?: boolean;
}) {
  return (
    <figure className="relative overflow-hidden rounded-lg border bg-muted/40">
      <div className="relative aspect-[4/3]">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {label ? (
        <figcaption className="absolute left-2 top-2">
          <Badge tone="primary">{label}</Badge>
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * A single portfolio project page. Server-rendered (static), image-led, and
 * dense with the unique copy + tags + verified review that make it non-thin —
 * and cross-linked back into the directory grid (business hub, location, style
 * gallery, sibling projects) so each project compounds the internal-link graph.
 */
export function PortfolioProjectView({
  project,
  businessName,
  verticalName,
  placeName,
  lastUpdatedLabel,
}: {
  project: PortfolioProject;
  businessName: string;
  verticalName: string;
  placeName: string;
  lastUpdatedLabel?: string;
}) {
  const hubPath = `/${project.vertical}/${project.location}/${project.business}/`;
  const locationPath = `/${project.vertical}/${project.location}/`;
  const before = project.images.find((i) => i.before);
  const after = project.images.find((i) => i.after);
  const rest = project.images.filter((i) => !i.before && !i.after);
  const related = relatedProjects(project);
  const socialPosts = buildSocialPack({
    project,
    businessName,
    placeName,
    url: siteUrl(projectPath(project)),
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={locationPath} className="hover:text-foreground hover:underline">
              {verticalName} in {placeName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={hubPath} className="hover:text-foreground hover:underline">
              {businessName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">Work</li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {project.title}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {project.locationName}
          </span>
          <span aria-hidden>·</span>
          <span>
            by{" "}
            <Link href={hubPath} className="font-medium text-foreground hover:underline">
              {businessName}
            </Link>
          </span>
        </p>
        <p className="text-lg leading-relaxed text-muted-foreground">{project.summary}</p>
      </header>

      <section aria-label="Project photos" className="space-y-3">
        {before && after ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ProjectImageTile image={before} label="Before" />
            <ProjectImageTile image={after} label="After" priority />
          </div>
        ) : null}
        {rest.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((img) => (
              <ProjectImageTile key={img.url} image={img} />
            ))}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="about-heading" className="space-y-3">
        <h2 id="about-heading" className="font-display text-xl font-semibold text-foreground">
          About this project
        </h2>
        <p className="leading-relaxed text-foreground">{project.description}</p>
        <ul className="flex flex-wrap gap-2 pt-1">
          <li>
            <Link href={locationPath}>
              <Badge tone="muted">{humanize(project.service)}</Badge>
            </Link>
          </li>
          <li>
            <Link href={ideasPath(project.style)}>
              <Badge tone="primary">{humanize(project.style)}</Badge>
            </Link>
          </li>
          {project.materials.map((m) => (
            <li key={m}>
              <Badge tone="muted">{humanize(m)}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {project.review ? (
        <section aria-labelledby="review-heading">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-primary" aria-hidden />
              <h2
                id="review-heading"
                className="font-display text-lg font-semibold text-foreground"
              >
                Verified review
              </h2>
            </CardHeader>
            <CardBody className="space-y-2">
              <div
                className="flex items-center gap-0.5"
                aria-label={`${project.review.rating} out of 5 stars`}
              >
                {Array.from({ length: project.review.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" aria-hidden />
                ))}
              </div>
              <p className="text-foreground">“{project.review.text}”</p>
              <p className="text-sm text-muted-foreground">— {project.review.author}</p>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-3">
          <h2
            id="related-heading"
            className="font-display text-xl font-semibold text-foreground"
          >
            More {humanize(project.style).toLowerCase()} &amp; {humanize(project.service).toLowerCase()} projects
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SocialPackPanel posts={socialPosts} />

      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Want work like this?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See {businessName}&apos;s full profile and Quality Score, or request a quote.
          </p>
        </div>
        <Link
          href={hubPath}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          View {businessName}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link href={hubPath} className="hover:text-foreground hover:underline">
          All {businessName} work
        </Link>
        <Link href={ideasPath(project.style)} className="hover:text-foreground hover:underline">
          {humanize(project.style)} garden ideas
        </Link>
        <Link href={locationPath} className="hover:text-foreground hover:underline">
          Best {verticalName} in {placeName}
        </Link>
      </p>

      {lastUpdatedLabel ? (
        <p className="text-xs text-muted-foreground">Updated {lastUpdatedLabel}</p>
      ) : null}
    </main>
  );
}
