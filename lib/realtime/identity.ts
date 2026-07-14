"use client";

import type { RoomIdentity } from "@/lib/realtime/events";

const key = (code: string) => `bs:identity:${code.toUpperCase()}`;

export function saveIdentity(identity: RoomIdentity): void {
  try {
    localStorage.setItem(key(identity.code), JSON.stringify(identity));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function loadIdentity(code: string): RoomIdentity | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as RoomIdentity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity(code: string): void {
  try {
    localStorage.removeItem(key(code));
  } catch {
    // Ignore.
  }
}
