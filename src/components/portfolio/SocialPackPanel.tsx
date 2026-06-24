"use client";

import { Megaphone } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { CopyButton } from "@/components/tools/CopyButton";
import { postWithHashtags, type SocialPost } from "@/lib/portfolio/social";
import { cn } from "@/lib/utils";

/**
 * Owner-facing "promote" panel: renders the generated social pack for a project
 * with one-tap copy per channel. Pure presentation over the build-time pack — no
 * network, no cost. The pack is computed server-side and passed in as props.
 */
export function SocialPackPanel({ posts }: { posts: SocialPost[] }) {
  return (
    <section aria-labelledby="promote-heading">
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <h2
              id="promote-heading"
              className="font-display text-lg font-semibold text-foreground"
            >
              Promote this project
            </h2>
            <p className="text-sm text-muted-foreground">
              Ready-to-paste posts for every channel — generated from this project.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-4">
            {posts.map((post) => {
              const copyValue = postWithHashtags(post);
              const count = copyValue.length;
              const over = post.charLimit != null && count > post.charLimit;
              return (
                <li key={post.platform} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{post.label}</p>
                      <p className="text-xs text-muted-foreground">{post.hint}</p>
                    </div>
                    <CopyButton value={copyValue} label={`Copy ${post.label}`} />
                  </div>

                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {post.body}
                  </pre>

                  {post.hashtags.length > 0 && (
                    <p className="mt-2 break-words text-sm text-primary">
                      {post.hashtags.join(" ")}
                    </p>
                  )}

                  {post.charLimit != null && (
                    <p
                      className={cn(
                        "mt-2 text-xs tabular-nums",
                        over ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {count}/{post.charLimit} characters
                      {over ? " — trim before posting" : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
