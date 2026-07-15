/** Pure formatting helpers shared across the UI. */

/** Two-letter monogram for an avatar. */
export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** Milliseconds as mm:ss. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Local HH:MM for a timestamp. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
