"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshArticles } from "@/app/actions";

// Persisted so the cooldown survives reloads; the server still enforces it
// authoritatively, this is just for the button's UX/countdown.
const STORAGE_KEY = "ingestCooldownUntil";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  // Tick every second, reading the cooldown deadline from localStorage. Updating
  // state inside the interval callback (not synchronously in the effect) keeps it
  // SSR/hydration-safe.
  useEffect(() => {
    function tick() {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const until = raw ? Number(raw) : 0;
      setRemainingMs(Math.max(0, until - Date.now()));
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function startCooldown(ms: number) {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + ms));
    setRemainingMs(ms);
  }

  function onClick() {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await refreshArticles();
        if (res.status === "cooldown") {
          startCooldown(res.retryAfterMs);
          setStatus("Just updated — hold on");
          return;
        }
        router.refresh();
        startCooldown(res.cooldownMs);
        const aiNote =
          res.aiClassified > 0 ? ` · ${res.aiClassified} AI-tagged` : "";
        setStatus(
          `Updated ${res.sourcesSucceeded}/${res.sourcesProcessed} sources${aiNote}`
        );
      } catch {
        setStatus("Update failed — try again");
      }
    });
  }

  const onCooldown = remainingMs > 0;
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const countdown = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3">
      {status ? (
        <span className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground">
          {status}
        </span>
      ) : null}
      <Button
        type="button"
        size="sm"
        onClick={onClick}
        disabled={isPending || onCooldown}
        className="text-[0.7rem] uppercase tracking-[0.2em]"
      >
        {isPending
          ? "Fetching…"
          : onCooldown
            ? `Wait ${countdown}`
            : "Fetch latest"}
      </Button>
    </div>
  );
}
