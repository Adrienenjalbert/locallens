"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";

/**
 * Copy-to-clipboard button with a transient "Copied" confirmation. Falls back
 * gracefully where the Clipboard API is unavailable. Client-only.
 */
export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context); leave label unchanged.
    }
  }, [value]);

  return (
    <Button
      type="button"
      size={size}
      onClick={onCopy}
      disabled={!value}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
