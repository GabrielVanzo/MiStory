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

/**
 * PUBLIC projection of an enigma. Deliberately has no `solution`/`explanation`
 * — those are secret and must never appear in a broadcast payload.
 */
export interface PublicEnigma {
  slug: string;
  title: string;
  /** The scene ("introdução") — safe for everyone. */
  teaser: string;
  difficulty: string;
}

/**
 * The solution, made public once the round is over. Until then this is null
 * and the answer exists only in the host's private `RoundSecret`.
 */
export interface RoundReveal {
  answer: string;
  explanation: string;
}

/** A question asked during a round, with the master's reply when answered. */
export interface QuestionDTO {
  id: string;
  /** Null once the asker leaves — the log outlives them. */
  playerId: string | null;
  /** Nickname snapshot, so the log stays readable after they leave. */
  authorName: string;
  content: string;
  createdAt: string;
  /** YES | NO | IRRELEVANT — null while awaiting the host. */
  answer: { value: string; createdAt: string } | null;
}

/** A player's single shot at the solution ("chute"), judged by the host. */
export interface GuessDTO {
  id: string;
  /** Null once the guesser leaves — the log outlives them. */
  playerId: string | null;
  authorName: string;
  content: string;
  /** PENDING | ACCEPTED | REJECTED. */
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** PUBLIC projection of a round. Safe to broadcast to the whole room. */
export interface PublicRound {
  id: string;
  number: number;
  /** ACTIVE | SOLVED | REVEALED | EXPIRED (see types/game.ts). */
  status: string;
  /** The player narrating this round (the host). */
  masterId: string | null;
  enigma: PublicEnigma;
  /** Server-authoritative deadline (ISO). Null once the round is over. */
  expiresAt: string | null;
  /** Who cracked it, when the round ended as SOLVED. */
  solvedById: string | null;
  /** Populated ONLY after the round ends — then it is public to everyone. */
  reveal: RoundReveal | null;
  /** The round's question log, oldest first. Public to everyone. */
  questions: QuestionDTO[];
  /** The round's guesses, oldest first. Public to everyone. */
  guesses: GuessDTO[];
}

/**
 * SECRET payload. Only ever emitted to the host's own socket, never broadcast.
 */
export interface RoundSecret {
  roundId: string;
  /** "resposta" — what actually happened. */
  answer: string;
  /** "explicação" — the reasoning. */
  explanation: string;
}

/**
 * One line of the leaderboard. Every field — including `rank` and `isTied` —
 * is computed on the SERVER; the client only renders it.
 */
export interface LeaderboardEntry {
  /** Null once the player left; the standing survives via `name`. */
  playerId: string | null;
  name: string;
  points: number;
  roundsWon: number;
  /** Standard competition ranking: ties share a rank (1, 2, 2, 4). */
  rank: number;
  /** True when at least one other entry has the same points. */
  isTied: boolean;
  /** False once the player left the room. */
  isPresent: boolean;
}

/** A finished round, summarised for the room's history. */
export interface RoundSummary {
  id: string;
  number: number;
  enigmaTitle: string;
  /** SOLVED | REVEALED | EXPIRED. */
  status: string;
  /** Who cracked it (name snapshot), null when nobody did. */
  winnerName: string | null;
  questionCount: number;
  guessCount: number;
  endedAt: string | null;
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
  /** Latest round, public fields only (null while in a fresh lobby). */
  round: PublicRound | null;
  /** Standings, ranked and tie-aware. Computed server-side. */
  leaderboard: LeaderboardEntry[];
  /** Finished rounds, newest first. */
  history: RoundSummary[];
  /**
   * Server clock at emit time (ISO). Clients use it to offset their own clock
   * so the countdown matches the server's authoritative deadline.
   */
  serverTime: string;
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
  /** HOST ONLY — emitted to a single socket, never to a room. */
  "round:secret": (secret: RoundSecret) => void;
}

/** Client → server events (all use ack callbacks). */
export interface ClientToServerEvents {
  "room:create": (input: CreateRoomInput, ack: (res: Ack<RoomJoinedPayload>) => void) => void;
  "room:join": (input: JoinRoomInput, ack: (res: Ack<RoomJoinedPayload>) => void) => void;
  "room:leave": (ack: (res: Ack<null>) => void) => void;
  /** Host-only: starts a round with a randomly chosen enigma. */
  "round:start": (ack: (res: Ack<PublicRound>) => void) => void;
  /** Host-only: ends the active round and reveals the solution to everyone. */
  "round:finish": (input: FinishRoundInput, ack: (res: Ack<PublicRound>) => void) => void;
  /** Host-only: clears round history and returns the room to the lobby. */
  "match:restart": (ack: (res: Ack<null>) => void) => void;
  /** Any detective (not the host): ask a yes/no question in the active round. */
  "question:ask": (input: AskQuestionInput, ack: (res: Ack<QuestionDTO>) => void) => void;
  /** Host-only: reply Sim / Não / Irrelevante to a question. */
  "question:answer": (input: AnswerQuestionInput, ack: (res: Ack<QuestionDTO>) => void) => void;
  /** Detective's single shot at the solution — one per round, ever. */
  "guess:submit": (input: SubmitGuessInput, ack: (res: Ack<GuessDTO>) => void) => void;
  /** Host-only: accept (ends the round, guesser wins) or reject (shot spent). */
  "guess:resolve": (input: ResolveGuessInput, ack: (res: Ack<GuessDTO>) => void) => void;
}

export interface SubmitGuessInput {
  content: string;
}

export interface ResolveGuessInput {
  guessId: string;
  accept: boolean;
}

export interface AskQuestionInput {
  content: string;
}

export interface AnswerQuestionInput {
  questionId: string;
  /** YES | NO | IRRELEVANT — anything else is rejected. */
  value: string;
}

export interface FinishRoundInput {
  /** SOLVED | REVEALED (the timer produces EXPIRED on its own). */
  outcome: "SOLVED" | "REVEALED";
  /** Optional: the player who cracked it (only meaningful for SOLVED). */
  solvedById?: string;
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
  /** Action requires being the host. */
  FORBIDDEN: "FORBIDDEN",
  ROUND_IN_PROGRESS: "ROUND_IN_PROGRESS",
  NO_ACTIVE_ROUND: "NO_ACTIVE_ROUND",
  NO_ENIGMAS: "NO_ENIGMAS",
  QUESTION_NOT_FOUND: "QUESTION_NOT_FOUND",
  /** The host narrates — they cannot ask questions. */
  HOST_CANNOT_ASK: "HOST_CANNOT_ASK",
  /** The host knows the answer — they cannot guess. */
  HOST_CANNOT_GUESS: "HOST_CANNOT_GUESS",
  /** One shot per round: this player already used theirs. */
  GUESS_ALREADY_USED: "GUESS_ALREADY_USED",
  GUESS_NOT_FOUND: "GUESS_NOT_FOUND",
  GUESS_ALREADY_RESOLVED: "GUESS_ALREADY_RESOLVED",
  INTERNAL: "INTERNAL",
} as const;

export type RealtimeErrorCode = (typeof RealtimeError)[keyof typeof RealtimeError];
