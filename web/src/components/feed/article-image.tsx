"use client";

import { useState } from "react";

// Plain <img> (not next/image) so arbitrary news-CDN domains work without an
// allowlist. Rendered as the root element so it stays a direct child of Card,
// which auto-rounds the top corners. If the URL is broken, we hide it entirely
// and the card falls back to its image-less layout.
export function ArticleImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="aspect-[16/9] w-full bg-muted object-cover"
      onError={() => setFailed(true)}
    />
  );
}
