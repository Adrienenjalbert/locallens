import type { Metadata } from "next";
import { IdeasGalleryView } from "@/views/IdeasGalleryView";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { findPublishedPage } from "@/lib/seo/pages";
import { siteUrl } from "@/lib/paths";
import {
  ideasPath,
  projectPath,
  projectStyles,
  projectsForStyle,
} from "@/lib/portfolio/projects";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";
import { humanize } from "@/lib/format";

interface RouteParams {
  style: string;
}

// Static export: one gallery per style that has at least one published project.
export function generateStaticParams(): RouteParams[] {
  return projectStyles().map((style) => ({ style }));
}

export function generateMetadata({ params }: { params: RouteParams }): Metadata {
  const styleLabel = humanize(params.style);
  const path = ideasPath(params.style);
  return buildPageMetadata({
    title: `${styleLabel} garden ideas — real local projects`,
    description: `Browse real ${styleLabel.toLowerCase()} garden projects from verified local pros, with before-and-after photos and honest reviews. Free to browse.`,
    path,
    modifiedTime: findPublishedPage(path)?.lastModified,
  });
}

export default function Page({ params }: { params: RouteParams }) {
  const styleLabel = humanize(params.style);
  const projects = projectsForStyle(params.style);
  const path = ideasPath(params.style);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    { name: `${styleLabel} garden ideas`, url: siteUrl(path) },
  ]);

  const collection = buildCollectionPageJsonLd({
    url: siteUrl(path),
    name: `${styleLabel} garden ideas`,
    description: `Real ${styleLabel.toLowerCase()} garden projects from verified local pros.`,
    items: projects.map((p) => ({
      name: p.title,
      url: siteUrl(projectPath(p)),
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdGraph([breadcrumb, collection]) }}
      />
      <IdeasGalleryView style={params.style} projects={projects} />
    </>
  );
}
