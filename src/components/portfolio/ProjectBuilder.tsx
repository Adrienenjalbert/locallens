"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Circle, ImagePlus, Trash2, Wand2 } from "lucide-react";
import Image from "next/image";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
} from "@/components/ui/primitives";
import { SocialPackPanel } from "@/components/portfolio/SocialPackPanel";
import { buildSocialPack } from "@/lib/portfolio/social";
import {
  STYLE_OPTIONS,
  draftSummary,
  formToProject,
  parseMaterials,
  projectReadiness,
  type ProjectForm,
} from "@/lib/portfolio/draft";
import { projectPath } from "@/lib/portfolio/projects";
import { humanize } from "@/lib/format";
import { siteUrl } from "@/lib/paths";
import { gardeners } from "@config/verticals/gardeners";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ImageRole = "photo" | "before" | "after";
interface BuilderImage {
  url: string;
  alt: string;
  role: ImageRole;
}

// Pre-fill (the "we found you" experience): in production this comes from the
// claimed business's scraped record. Seeded here so the builder is alive on load.
const DEFAULTS = {
  vertical: "gardeners",
  location: "manchester",
  business: "greenthumb-gardens",
  businessName: "GreenThumb Gardens",
  placeName: "Manchester",
};

function baseForm(state: {
  title: string;
  area: string;
  service: string;
  style: string;
  materialsInput: string;
  images: BuilderImage[];
}): Omit<ProjectForm, "summary"> {
  return {
    vertical: DEFAULTS.vertical,
    location: DEFAULTS.location,
    business: DEFAULTS.business,
    businessName: DEFAULTS.businessName,
    title: state.title,
    area: state.area,
    service: state.service,
    style: state.style,
    materials: parseMaterials(state.materialsInput),
    images: state.images
      .filter((i) => i.url.trim())
      .map((i) => ({
        url: i.url.trim(),
        alt: i.alt.trim(),
        before: i.role === "before",
        after: i.role === "after",
      })),
  };
}

// Initial pre-fill values, kept in one place so the field state and the first
// drafted summary derive from the same source.
const INITIAL: {
  title: string;
  area: string;
  service: string;
  style: string;
  materialsInput: string;
  images: BuilderImage[];
} = {
  title: "Modern porcelain patio in Didsbury",
  area: "Didsbury",
  service: gardeners.taxonomy.services[0] ?? "landscaping",
  style: STYLE_OPTIONS[0],
  materialsInput: "porcelain, composite decking",
  images: [
    { url: "https://picsum.photos/seed/builder-before/1200/900", alt: "", role: "before" },
    { url: "https://picsum.photos/seed/builder-after/1200/900", alt: "", role: "after" },
  ],
};

export function ProjectBuilder({ businessId }: { businessId?: string }) {
  const [title, setTitle] = useState(INITIAL.title);
  const [area, setArea] = useState(INITIAL.area);
  const [service, setService] = useState(INITIAL.service);
  const [style, setStyle] = useState<string>(INITIAL.style);
  const [materialsInput, setMaterialsInput] = useState(INITIAL.materialsInput);
  const [images, setImages] = useState<BuilderImage[]>(INITIAL.images);
  const [summary, setSummary] = useState(() =>
    draftSummary({ ...baseForm(INITIAL), summary: undefined }),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "preview" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const form: ProjectForm = useMemo(
    () => ({
      ...baseForm({ title, area, service, style, materialsInput, images }),
      summary,
    }),
    [title, area, service, style, materialsInput, images, summary],
  );
  const project = useMemo(() => formToProject(form), [form]);
  const readiness = useMemo(() => projectReadiness(form), [form]);
  const posts = useMemo(
    () =>
      buildSocialPack({
        project,
        businessName: DEFAULTS.businessName,
        placeName: DEFAULTS.placeName,
        url: siteUrl(projectPath(project)),
      }),
    [project],
  );

  function regenerateSummary() {
    setSummary(
      draftSummary({
        ...baseForm({ title, area, service, style, materialsInput, images }),
        summary: undefined,
      }),
    );
  }

  function updateImage(index: number, patch: Partial<BuilderImage>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }
  function addImage() {
    setImages((prev) => [...prev, { url: "", alt: "", role: "photo" }]);
  }
  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onPublish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!readiness.ready) return;
    setError(null);

    // No backend wired (static demo): show the confirmed preview state.
    if (!supabase || !businessId) {
      setStatus("preview");
      return;
    }

    setStatus("saving");
    const { error: insertError } = await supabase.from("portfolio_item").insert({
      business_id: businessId,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      description: project.description,
      service: project.service,
      style: project.style,
      materials: project.materials,
      images: project.images.map((i) => i.url),
      images_meta: project.images,
      location: project.locationName,
      completed_at: project.completedAt,
      published: false, // human-gate before it goes public
    });
    if (insertError) {
      setError(insertError.message);
      setStatus("error");
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Add a project
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add a few details and photos — we write the page and the social posts for you.
          Confirm or tweak, then publish.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── The form ─────────────────────────────────────────────── */}
        <form onSubmit={onPublish} className="space-y-5" aria-label="Add a project">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold text-foreground">
                The job
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="What was the job?" htmlFor="pb-title">
                <Input
                  id="pb-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Modern porcelain patio in Didsbury"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Area / town" htmlFor="pb-area">
                  <Input
                    id="pb-area"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Didsbury"
                  />
                </Field>
                <Field label="Service" htmlFor="pb-service">
                  <Select
                    id="pb-service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  >
                    {gardeners.taxonomy.services.map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Style" htmlFor="pb-style">
                  <Select
                    id="pb-style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    {STYLE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Materials (comma-separated)" htmlFor="pb-materials">
                  <Input
                    id="pb-materials"
                    value={materialsInput}
                    onChange={(e) => setMaterialsInput(e.target.value)}
                    placeholder="porcelain, decking"
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">Photos</h2>
              <Button type="button" variant="ghost" size="sm" onClick={addImage}>
                <ImagePlus className="h-4 w-4" aria-hidden /> Add photo
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              {images.map((img, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Field label={`Photo ${i + 1} URL`} htmlFor={`pb-img-${i}`}>
                      <Input
                        id={`pb-img-${i}`}
                        type="url"
                        inputMode="url"
                        value={img.url}
                        onChange={(e) => updateImage(i, { url: e.target.value })}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                  <Select
                    aria-label={`Photo ${i + 1} type`}
                    className="w-32"
                    value={img.role}
                    onChange={(e) => updateImage(i, { role: e.target.value as ImageRole })}
                  >
                    <option value="photo">Photo</option>
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Tip: add a “before” and an “after” to unlock the comparison view and the
                Reel script.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Description
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={regenerateSummary}>
                <Wand2 className="h-4 w-4" aria-hidden /> Regenerate from details
              </Button>
            </CardHeader>
            <CardBody className="space-y-2">
              <label htmlFor="pb-summary" className="sr-only">
                Project summary
              </label>
              <textarea
                id="pb-summary"
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We drafted this from your details — edit anything that isn’t quite right.
              </p>
            </CardBody>
          </Card>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!readiness.ready || status === "saving"}>
              {status === "saving" ? "Publishing…" : "Publish project"}
            </Button>
            {!readiness.ready && (
              <p className="text-sm text-muted-foreground">
                Add {readiness.missing.join(", ")} to publish.
              </p>
            )}
            {status === "saved" && (
              <p className="text-sm text-success">Submitted — live after a quick review.</p>
            )}
            {status === "preview" && (
              <p className="text-sm text-muted-foreground">
                This is exactly how your page and posts will look. Connect your account to
                publish.
              </p>
            )}
          </div>
        </form>

        {/* ── Live preview ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Your page preview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Updates live · publishes to{" "}
                <span className="break-all font-mono text-xs">{projectPath(project)}</span>
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              <Readiness missing={readiness.missing} />
              <h3 className="font-display text-xl font-semibold text-foreground">
                {project.title || "Your project title"}
              </h3>
              {project.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {project.images.slice(0, 2).map((img, i) => (
                    <div
                      key={img.url}
                      className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted/40"
                    >
                      <Image
                        src={img.url}
                        alt={img.alt}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {project.summary}
              </p>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Badge tone="muted">{humanize(project.service)}</Badge>
                </li>
                <li>
                  <Badge tone="primary">{humanize(project.style)}</Badge>
                </li>
                {project.materials.map((m) => (
                  <li key={m}>
                    <Badge tone="muted">{humanize(m)}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <SocialPackPanel posts={posts} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Readiness({ missing }: { missing: string[] }) {
  const ready = missing.length === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        ready
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {ready ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {ready ? "Ready to publish" : `Still needed: ${missing.join(", ")}`}
    </div>
  );
}
