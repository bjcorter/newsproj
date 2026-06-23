"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Plain <img> (not next/image) so arbitrary news-CDN domains work without an
// allowlist. The grayscale + sepia filter gives an aged-print look. If the URL
// is broken we hide the whole figure (image + caption) so the card falls back
// to its image-less layout.
export function ArticleImage({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          "aspect-[16/9] w-full border border-foreground/40 bg-muted object-cover",
          className
        )}
      />
      {caption ? (
        <figcaption className="mt-1.5 text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
