"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { RoomState } from "@/lib/realtime/events";
import { diffRoomEvents, type RoomEvent } from "@/features/room/room-events";
import { useRoom } from "@/features/room/room-provider";

const NOTIFY: Record<RoomEvent["tone"], (title: string, opts?: { description?: string }) => void> =
  {
    plain: toast,
    info: toast.info,
    success: toast.success,
    warning: toast.warning,
    error: toast.error,
  };

/**
 * Announces state changes as toasts.
 *
 * All the rules live in `diffRoomEvents` (pure, tested); this only wires the
 * result to the toaster and remembers the previous snapshot.
 */
export function useRoomEvents(): void {
  const { room, me } = useRoom();
  const previousRef = useRef<RoomState | null>(null);
  const myId = me?.id ?? null;

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = room;

    for (const event of diffRoomEvents(previous, room, myId)) {
      NOTIFY[event.tone](
        event.title,
        event.description ? { description: event.description } : undefined,
      );
    }
  }, [room, myId]);
}
