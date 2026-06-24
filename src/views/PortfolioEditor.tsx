"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  EmptyState,
} from "@/components/ui/primitives";
import { supabase } from "@/lib/supabase";

// Mirrors the `portfolio_item` row shape (supabase/migrations/0001_foundation.sql).
// A single image URL from the form maps onto the `images text[]` column.
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  images: string[];
}

interface PortfolioRow {
  id: string;
  title: string | null;
  description: string | null;
  images: string[] | null;
}

function rowToItem(row: PortfolioRow): PortfolioItem {
  return {
    id: row.id,
    title: row.title ?? "Untitled",
    description: row.description ?? "",
    images: row.images ?? [],
  };
}

const DEMO_ITEMS: PortfolioItem[] = [
  {
    id: "demo-1",
    title: "Full lawn renovation, Didsbury",
    description: "Scarified, aerated and re-seeded a 120m² lawn over two visits.",
    images: ["https://images.example.com/portfolio/lawn-didsbury.jpg"],
  },
];

export function PortfolioEditor({
  businessId,
  onCountChange,
}: {
  businessId?: string;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !businessId) {
        // Local dev / no backend: seed with demo data so the UI is meaningful.
        if (active) {
          setItems(DEMO_ITEMS);
          setLoading(false);
        }
        return;
      }
      const { data, error: loadError } = await supabase
        .from("portfolio_item")
        .select("id,title,description,images")
        .eq("business_id", businessId)
        .order("completed_at", { ascending: false });
      if (!active) return;
      if (loadError) {
        setError(loadError.message);
        setItems([]);
      } else {
        setItems((data ?? []).map((r) => rowToItem(r as PortfolioRow)));
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [businessId]);

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const images = imageUrl.trim() ? [imageUrl.trim()] : [];

    if (supabase && businessId) {
      const { data, error: insertError } = await supabase
        .from("portfolio_item")
        .insert({
          business_id: businessId,
          title: title.trim(),
          description: description.trim() || null,
          images,
        })
        .select("id,title,description,images")
        .single();
      if (insertError || !data) {
        setError(insertError?.message ?? "Could not save — please try again.");
        setSaving(false);
        return;
      }
      setItems((prev) => [rowToItem(data as PortfolioRow), ...prev]);
    } else {
      // No backend: keep it in local state so the flow still demonstrates.
      setItems((prev) => [
        {
          id: `local-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          images,
        },
        ...prev,
      ]);
    }

    setTitle("");
    setDescription("");
    setImageUrl("");
    setSaving(false);
  }

  function onRemove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (supabase && businessId && !id.startsWith("local-")) {
      void supabase.from("portfolio_item").delete().eq("id", id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-base font-semibold text-foreground">
          Portfolio
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Real photos of completed work. Portfolio is{" "}
          <span className="font-medium text-foreground">25% of your Quality Score</span>{" "}
          in this vertical — add at least 3 to lift your rank.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <form onSubmit={onAdd} className="space-y-3" aria-label="Add a portfolio item">
          <div className="space-y-1.5">
            <label htmlFor="pf-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="pf-title"
              required
              placeholder="e.g. Lawn renovation in Didsbury"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="pf-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <Input
              id="pf-description"
              placeholder="What you did, the result, how long it took"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pf-image" className="text-sm font-medium text-foreground">
              Image URL
            </label>
            <Input
              id="pf-image"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={saving}>
            <ImagePlus className="h-4 w-4" aria-hidden />
            {saving ? "Adding…" : "Add to portfolio"}
          </Button>
        </form>

        <div aria-live="polite">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading portfolio…</p>
          ) : items.length === 0 ? (
            <EmptyState
              title="No portfolio items yet"
              description="Add photos of completed jobs to show prospective customers your work and improve your rank."
            />
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-md border bg-background p-3"
                >
                  <div
                    aria-hidden
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground"
                  >
                    <ImagePlus className="h-5 w-5 opacity-50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
