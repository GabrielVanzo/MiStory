"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyIcon, CrownIcon, GhostIcon, LogOutIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import type { PlayerDTO } from "@/lib/realtime/events";
import { Brand } from "@/components/layout/brand";
import { StatusScreen } from "@/components/layout/status-screen";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnigmaCard, HostSecretPanel, RoundRevealPanel } from "@/features/room/enigma-card";
import { GuessButton, GuessPanel } from "@/features/room/guess-panel";
import { HostControls } from "@/features/room/host-controls";
import { Leaderboard, RoomHistory } from "@/features/room/leaderboard";
import { AskBar, QuestionFeed } from "@/features/room/question-feed";
import { useRoom } from "@/features/room/room-provider";

function fallbackStyle(color: string | null) {
  return color ? { backgroundColor: `${color}22`, color } : undefined;
}

function initials(nickname: string) {
  return nickname.slice(0, 2).toUpperCase();
}

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

function PlayerRow({ player, isMe }: { player: PlayerDTO; isMe: boolean }) {
  return (
    <li className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors">
      <span className="relative">
        <Avatar size="sm">
          <AvatarFallback style={fallbackStyle(player.color)}>
            {initials(player.nickname)}
          </AvatarFallback>
        </Avatar>
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
          {player.nickname}
          {isMe ? <span className="text-muted-foreground text-xs">(você)</span> : null}
          {player.isHost ? <CrownIcon className="text-warning size-3.5" /> : null}
        </p>
        <p className="text-muted-foreground text-xs">
          {player.isHost ? "Anfitrião" : "Detetive"} · {player.isConnected ? "online" : "offline"}
        </p>
      </div>
    </li>
  );
}

export function RoomView() {
  const router = useRouter();
  const { phase, connection, room, me, isHost, secret, busy, error, leave, startRound } = useRoom();
  const [leaving, setLeaving] = useState(false);

  if (phase === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
        <Spinner size="lg" className="text-primary" />
        <p className="text-muted-foreground text-sm">Conectando à sala...</p>
      </main>
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
    <div className="flex flex-1 flex-col">
      <header className="border-border/60 surface-glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/" showText={false} />
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-medium">{room.name}</p>
              <button
                type="button"
                onClick={copyCode}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-xs transition-colors"
              >
                {room.code} <CopyIcon className="size-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AvatarGroup className="hidden sm:flex">
              {room.players.slice(0, 4).map((p) => (
                <Avatar key={p.id} size="sm">
                  <AvatarFallback style={fallbackStyle(p.color)}>
                    {initials(p.nickname)}
                  </AvatarFallback>
                </Avatar>
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

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Round in progress, or the waiting lobby */}
        <div className="flex min-h-0 flex-col gap-4">
          {room.round ? (
            <>
              <EnigmaCard round={room.round} />
              {/* Rendered only for the host — `secret` is null for everyone else. */}
              {secret ? <HostSecretPanel secret={secret} /> : null}
              {/* Public once the server ends the round. */}
              <RoundRevealPanel round={room.round} />
              {isHost ? <HostControls /> : null}
              <GuessPanel round={room.round} />
              <QuestionFeed round={room.round} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <AskBar round={room.round} />
                </div>
                <GuessButton round={room.round} />
              </div>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </>
          ) : (
            <Card className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
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
                      Você será o mestre e verá a resposta.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aguardando o anfitrião iniciar a partida.
                  </p>
                )}
                {error ? <p className="text-destructive text-sm">{error}</p> : null}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Players / standings / history */}
        <aside className="flex flex-col">
          <Card className="flex-1">
            <CardContent className="p-0">
              <Tabs defaultValue="jogadores" className="gap-0">
                <div className="px-3 pt-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
                    <TabsTrigger value="ranking">Ranking</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="jogadores" className="mt-0 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Na sala</span>
                    <Badge variant="secondary">
                      {room.players.length}/{room.maxPlayers}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {room.players.map((player) => (
                      <PlayerRow key={player.id} player={player} isMe={player.id === me?.id} />
                    ))}
                  </ul>
                </TabsContent>

                <TabsContent value="ranking" className="mt-0 p-3">
                  <Leaderboard entries={room.leaderboard} />
                </TabsContent>

                <TabsContent value="historico" className="mt-0 p-3">
                  <RoomHistory history={room.history} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
