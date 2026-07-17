"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  CrownIcon,
  GhostIcon,
  LogOutIcon,
  PlugZapIcon,
  RotateCcwIcon,
  SparklesIcon,
  UsersIcon,
  WandIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { PlayerDTO, RoomState } from "@/lib/realtime/events";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/layout/brand";
import { StatusScreen } from "@/components/layout/status-screen";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnigmaCard, MasterSecretPanel, RoundRevealPanel } from "@/features/room/enigma-card";
import { GuessButton, PendingGuessModal } from "@/features/room/guess-panel";
import { HintsPanel } from "@/features/room/hints-panel";
import { RoundControls } from "@/features/room/host-controls";
import { PlayerAvatar } from "@/features/room/player-avatar";
import { Leaderboard, RoomHistory } from "@/features/room/leaderboard";
import { AskBar, QuestionFeed } from "@/features/room/question-feed";
import { useRoom } from "@/features/room/room-provider";
import { RoomSkeleton } from "@/features/room/room-skeleton";
import { useRoomEvents } from "@/features/room/use-room-events";
import { YesHighlights } from "@/features/room/yes-highlights";

type FeedFilter = "all" | "yes";

/** Gate shown when opening a room link without a stored identity. */
function JoinGate() {
  const { code, join, error } = useRoom();
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleJoin() {
    if (!nickname.trim()) return;
    setSubmitting(true);
    await join(nickname);
    setSubmitting(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Entrar na sala</CardTitle>
          <p className="text-muted-foreground font-mono text-sm">{code}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="gate-nick">Seu apelido</Label>
            <Input
              id="gate-nick"
              autoFocus
              placeholder="Como te chamam na mesa?"
              value={nickname}
              maxLength={20}
              disabled={submitting}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button className="w-full" onClick={handleJoin} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : null}
            Entrar
          </Button>
          <Button asChild variant="ghost" className="w-full" disabled={submitting}>
            <Link href="/">Voltar</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function PlayerRow({
  player,
  isMe,
  isMaster,
  isEliminated,
}: {
  player: PlayerDTO;
  isMe: boolean;
  isMaster: boolean;
  isEliminated: boolean;
}) {
  const role = player.isHost ? "Anfitrião" : "Detetive";
  return (
    <li className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors">
      <span className="relative">
        <PlayerAvatar name={player.nickname} color={player.color} />
        <span
          aria-hidden
          className={
            "ring-card absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 " +
            (player.isConnected ? "bg-success" : "bg-muted-foreground/50")
          }
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className={isEliminated ? "text-muted-foreground line-through" : undefined}>
            {player.nickname}
          </span>
          {isMe ? <span className="text-muted-foreground text-xs">(você)</span> : null}
          {player.isHost ? <CrownIcon className="text-warning size-3.5" /> : null}
          {isMaster ? <WandIcon className="text-primary size-3.5" /> : null}
        </p>
        <p className="text-muted-foreground text-xs">
          {isMaster ? "Mestre" : isEliminated ? "Fora da rodada" : role} ·{" "}
          {player.isConnected ? "online" : "offline"}
        </p>
      </div>
    </li>
  );
}

/** Players / standings / history — the room's side panel (rail on desktop, drawer on mobile). */
function SidePanel({
  room,
  meId,
  className,
}: {
  room: RoomState;
  meId: string | null;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <Tabs defaultValue="jogadores" className="flex h-full flex-col gap-0">
          <div className="px-3 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="jogadores" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Na sala</span>
              <Badge variant="secondary">
                {room.players.length}/{room.maxPlayers}
              </Badge>
            </div>
            <ul className="space-y-1">
              {room.players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isMe={player.id === meId}
                  isMaster={room.round?.masterId === player.id}
                  isEliminated={Boolean(
                    room.round?.guesses.some(
                      (g) => g.playerId === player.id && g.status === "REJECTED",
                    ),
                  )}
                />
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="ranking" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
            <Leaderboard entries={room.leaderboard} />
          </TabsContent>

          <TabsContent value="historico" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
            <RoomHistory history={room.history} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** Detective-only segmented control to narrow the feed to confirmed answers. */
function FeedFilterToggle({
  value,
  onChange,
}: {
  value: FeedFilter;
  onChange: (v: FeedFilter) => void;
}) {
  const opts: { key: FeedFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "yes", label: 'Só "Sim"' },
  ];
  return (
    <div className="bg-muted/40 ring-border inline-flex rounded-lg p-0.5 ring-1">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === o.key
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RoomView() {
  const router = useRouter();
  const {
    phase,
    connection,
    room,
    me,
    isHost,
    isMaster,
    secret,
    busy,
    error,
    leave,
    retry,
    startRound,
  } = useRoom();
  const [leaving, setLeaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  // Announces what changed (joins, answers, round end...) as toasts.
  useRoomEvents();

  if (phase === "loading") return <RoomSkeleton />;

  if (phase === "unreachable") {
    return (
      <StatusScreen
        media={<PlugZapIcon />}
        mediaClassName="bg-destructive/10 text-destructive ring-destructive/20"
        title="Sem conexão com o servidor"
        description="Não conseguimos falar com o servidor da partida. Verifique sua conexão e tente novamente."
      >
        <Button onClick={retry}>
          <RotateCcwIcon /> Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Início</Link>
        </Button>
      </StatusScreen>
    );
  }

  if (phase === "closed") {
    return (
      <StatusScreen
        media={<GhostIcon />}
        title="Sala encerrada"
        description="Esta sala não está mais disponível. Você pode criar uma nova ou entrar em outra."
      >
        <Button asChild>
          <Link href="/criar">Criar sala</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Início</Link>
        </Button>
      </StatusScreen>
    );
  }

  if (phase === "needs-join") return <JoinGate />;

  if (!room) return null;

  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  async function handleLeave() {
    setLeaving(true);
    await leave();
    router.push("/");
  }

  const connectedCount = room.players.filter((p) => p.isConnected).length;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="border-border/60 surface-glass z-40 shrink-0 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/" showText={false} />
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-medium">{room.name}</p>
              <button
                type="button"
                onClick={copyCode}
                aria-label={`Copiar o código da sala, ${room.code}`}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-1 rounded font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {room.code} <CopyIcon className="size-3" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AvatarGroup className="hidden sm:flex">
              {room.players.slice(0, 4).map((p) => (
                <PlayerAvatar key={p.id} name={p.nickname} color={p.color} />
              ))}
              {room.players.length > 4 ? (
                <AvatarGroupCount>+{room.players.length - 4}</AvatarGroupCount>
              ) : null}
            </AvatarGroup>
            {connection === "connected" ? (
              <Badge variant="success" className="hidden sm:inline-flex">
                Ao vivo
              </Badge>
            ) : (
              <Badge variant="warning" className="hidden items-center gap-1 sm:inline-flex">
                <Spinner size="xs" /> Reconectando
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleLeave} disabled={leaving}>
              <LogOutIcon /> Sair
            </Button>
          </div>
        </div>
      </header>

      {connection === "reconnecting" ? (
        <div className="bg-warning/10 text-warning border-warning/20 flex items-center justify-center gap-2 border-b py-1.5 text-xs">
          <Spinner size="xs" /> Conexão perdida — tentando reconectar...
        </div>
      ) : null}

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-4 sm:px-6 sm:py-4">
        {/* Left rail: confirmed ("Sim") questions — widescreen only. */}
        {room.round ? (
          <aside className="hidden w-[260px] shrink-0 xl:flex">
            <YesHighlights round={room.round} className="min-h-0 flex-1" />
          </aside>
        ) : null}

        {/* Main app-shell column: fixed story, one scroll region, fixed action bar. */}
        <main className="flex min-h-0 flex-1 flex-col">
          {room.round ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 sm:px-0 sm:pt-0">
              {/* Story — stays put at the top. */}
              <EnigmaCard round={room.round} />

              {/* Toolbar: feed filter (detectives) + side-panel opener (mobile). */}
              <div className="flex shrink-0 items-center gap-2">
                {!isMaster ? (
                  <FeedFilterToggle value={feedFilter} onChange={setFeedFilter} />
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto lg:hidden"
                  onClick={() => setPanelOpen(true)}
                >
                  <UsersIcon /> Sala
                </Button>
              </div>

              {/* Contextual panels sit above the feed; the feed is the scroller. */}
              {secret ? <MasterSecretPanel secret={secret} /> : null}
              <RoundRevealPanel round={room.round} />
              <HintsPanel round={room.round} />

              <QuestionFeed round={room.round} filter={isMaster ? "all" : feedFilter} />

              {/* Master-only judging pop-up — self-gates on the secret payload. */}
              <PendingGuessModal />

              {/* Fixed action bar: detective composer / guess, or the master's controls. */}
              <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 shrink-0 pb-[env(safe-area-inset-bottom)] backdrop-blur">
                {isMaster ? (
                  <RoundControls />
                ) : room.round.status === "WAITING" || room.round.status === "ACTIVE" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <AskBar round={room.round} />
                    </div>
                    <GuessButton round={room.round} />
                  </div>
                ) : (
                  <RoundControls />
                )}
                {error ? <p className="text-destructive mt-1 text-sm">{error}</p> : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <Card className="flex w-full max-w-md flex-col items-center gap-5 py-16 text-center">
                <CardContent className="flex flex-col items-center gap-5">
                  <div className="bg-primary/15 text-primary ring-primary/25 flex size-16 items-center justify-center rounded-2xl ring-1">
                    <UsersIcon className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Sala de espera</h2>
                    <p className="text-muted-foreground max-w-sm text-balance">
                      {connectedCount} de {room.maxPlayers} detetives conectados.
                    </p>
                  </div>
                  {isHost ? (
                    <div className="flex flex-col items-center gap-2">
                      <Button onClick={startRound} disabled={busy}>
                        {busy ? <Spinner size="sm" /> : <SparklesIcon />}
                        Sortear enigma e iniciar
                      </Button>
                      <p className="text-muted-foreground text-xs">
                        O mestre é sorteado por ordem de entrada e alterna a cada rodada.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aguardando o anfitrião iniciar a partida.
                    </p>
                  )}
                  {error ? <p className="text-destructive text-sm">{error}</p> : null}
                  {/* Mobile: reach players/ranking/history from the lobby too. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setPanelOpen(true)}
                  >
                    <UsersIcon /> Ver a sala
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Right side panel — fixed column on desktop. */}
        <aside className="hidden w-[320px] shrink-0 lg:flex">
          <SidePanel room={room} meId={me?.id ?? null} className="min-h-0 flex-1" />
        </aside>
      </div>

      {/* Mobile side-panel drawer. */}
      {panelOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />
          <div className="animate-in slide-in-from-right bg-background absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <span className="text-sm font-medium">A sala</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen(false)}
                aria-label="Fechar"
              >
                <XIcon />
              </Button>
            </div>
            <SidePanel
              room={room}
              meId={me?.id ?? null}
              className="min-h-0 flex-1 rounded-none border-0"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
