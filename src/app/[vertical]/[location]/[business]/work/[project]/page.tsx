import type { Metadata } from "next";
import { PortfolioProjectView } from "@/views/PortfolioProjectView";
import { VERTICALS } from "@config/index";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { findPublishedPage } from "@/lib/seo/pages";
import { siteUrl } from "@/lib/paths";
import { formatMonthYear, titleCaseSlug } from "@/lib/format";
import {
  allProjects,
  findProject,
  projectPath,
} from "@/lib/portfolio/projects";
import {
  buildBreadcrumbJsonLd,
  buildCreativeWorkJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";

interface RouteParams {
  vertical: string;
  location: string;
  business: string;
  project: string;
}

// Static export: enumerate every published project page. In production this is
// driven by the `portfolio_item` table (one page per readiness-passing project);
// here it reads the seeded projects module so the route builds under `export`.
export function generateStaticParams(): RouteParams[] {
  return allProjects().map((p) => ({
    vertical: p.vertical,
    location: p.location,
    business: p.business,
    project: p.slug,
  }));
}

export function generateMetadata({ params }: { params: RouteParams }): Metadata {
  const project = findProject(
    params.vertical,
    params.location,
    params.business,
    params.project,
  );
  const businessName = titleCaseSlug(params.business);
  const place = titleCaseSlug(params.location);
  const path = `/${params.vertical}/${params.location}/${params.business}/work/${params.project}/`;

  if (!project) {
    return buildPageMetadata({
      title: `${businessName} project — ${place}`,
      description: `A completed project by ${businessName} in ${place}.`,
      path,
      type: "article",
    });
  }

  return buildPageMetadata({
    title: `${project.title} — ${businessName}`,
    description: project.summary.slice(0, 155),
    path,
    type: "article",
    modifiedTime: project.lastModified,
  });
}

export default function Page({ params }: { params: RouteParams }) {
  const vertical = VERTICALS[params.vertical];
  const verticalName = (vertical?.name ?? params.vertical).toLowerCase();
  const businessName = titleCaseSlug(params.business);
  const place = titleCaseSlug(params.location);
  const project = findProject(
    params.vertical,
    params.location,
    params.business,
    params.project,
  );

  if (!project) {
    // Should not happen under static export (params come from the same source),
    // but render a minimal fallback rather than throwing during build.
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Project not found
        </h1>
      </main>
    );
  }

  const path = projectPath(project);
  const hubPath = `/${project.vertical}/${project.location}/${project.business}/`;
  const published = findPublishedPage(path);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    {
      name: `${vertical?.name ?? params.vertical} in ${place}`,
      url: siteUrl(`/${params.vertical}/${params.location}/`),
    },
    { name: businessName, url: siteUrl(hubPath) },
    { name: project.title, url: siteUrl(path) },
  ]);

  const creativeWork = buildCreativeWorkJsonLd({
    url: siteUrl(path),
    name: project.title,
    description: project.summary,
    images: project.images.map((i) => i.url),
    creator: { name: businessName, url: siteUrl(hubPath) },
    dateCreated: project.completedAt,
    locationCreated: project.locationName,
    keywords: [project.service, project.style, ...project.materials],
    review: project.review
      ? {
          author: project.review.author,
          ratingValue: project.review.rating,
          reviewBody: project.review.text,
        }
      : undefined,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdGraph([breadcrumb, creativeWork]) }}
      />
      <PortfolioProjectView
        project={project}
        businessName={businessName}
        verticalName={verticalName}
        placeName={place}
        lastUpdatedLabel={formatMonthYear(published?.lastModified ?? project.lastModified)}
      />
    </>
  );
}
