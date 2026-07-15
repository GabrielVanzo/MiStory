"use client";

import { useEffect, useState } from "react";

/**
 * Remaining milliseconds until `expiresAt`, corrected by the server clock
 * offset so a skewed device clock cannot drift from the server's deadline.
 *
 * Display only — the SERVER owns expiry and ends the round itself.
 * Returns null when there is no deadline (or before the first tick).
 *
 * The clock is read only inside the interval callback, never during render,
 * keeping the hook pure.
 */
export function useCountdown(expiresAt: string | null, offsetMs = 0): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt || now === null) return null;
  return Math.max(0, new Date(expiresAt).getTime() - (now + offsetMs));
}

/** Formats milliseconds as mm:ss. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
