/**
 * Shared Socket.IO contract between the browser client and the standalone
 * realtime server. Types only — safe to import from both sides (Next via the
 * "@/" alias, the tsx server via a relative path).
 *
 * Stage 5 scope: rooms, players, presence, host, reconnection, sync.
 * No match/round/question logic yet.
 */

/** Public projection of a Player row sent to clients. */
export interface PlayerDTO {
  id: string;
  nickname: string;
  color: string | null;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: string;
}

/** Full room snapshot broadcast on every change (source of truth for the UI). */
export interface RoomState {
  id: string;
  code: string;
  name: string;
  status: string;
  isPrivate: boolean;
  maxPlayers: number;
  hostId: string | null;
  players: PlayerDTO[];
}

export interface CreateRoomInput {
  name: string;
  nickname: string;
  isPrivate?: boolean;
  maxPlayers?: number;
  password?: string;
}

export interface JoinRoomInput {
  code: string;
  nickname: string;
  password?: string;
  /** Present when resuming an existing identity (reconnection / revisit). */
  sessionToken?: string;
}

/** What a client stores locally to reclaim its seat after a reload/reconnect. */
export interface RoomIdentity {
  code: string;
  playerId: string;
  sessionToken: string;
}

export interface RoomJoinedPayload {
  room: RoomState;
  playerId: string;
  sessionToken: string;
}

/** Generic acknowledgement returned via socket callbacks. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

/** Server → client events. */
export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:closed": (reason: string) => void;
}

/** Client → server events (all use ack callbacks). */
export interface ClientToServerEvents {
  "room:create": (input: CreateRoomInput, ack: (res: Ack<RoomJoinedPayload>) => void) => void;
  "room:join": (input: JoinRoomInput, ack: (res: Ack<RoomJoinedPayload>) => void) => void;
  "room:leave": (ack: (res: Ack<null>) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

/** Per-connection state the server attaches to each socket. */
export interface SocketData {
  playerId?: string;
  roomId?: string;
  code?: string;
}

/** Stable error codes so the client can localize messages. */
export const RealtimeError = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  NICKNAME_TAKEN: "NICKNAME_TAKEN",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  INVALID_INPUT: "INVALID_INPUT",
  NOT_IN_ROOM: "NOT_IN_ROOM",
  INTERNAL: "INTERNAL",
} as const;

export type RealtimeErrorCode = (typeof RealtimeError)[keyof typeof RealtimeError];
