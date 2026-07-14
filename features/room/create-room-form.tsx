"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { createRoom, realtimeErrorMessage } from "@/lib/realtime/actions";
import { saveIdentity } from "@/lib/realtime/identity";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState("6");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !nickname.trim()) {
      toast.error("Preencha o nome da sala e seu apelido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createRoom({
        name,
        nickname,
        isPrivate,
        maxPlayers: Number(maxPlayers),
      });
      saveIdentity({
        code: res.room.code,
        playerId: res.playerId,
        sessionToken: res.sessionToken,
      });
      router.push(`/sala/${res.room.code}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INTERNAL";
      toast.error(realtimeErrorMessage(msg));
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar sala</CardTitle>
        <CardDescription>Configure a mesa e convide seus detetives.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="room-name">Nome da sala</Label>
          <Input
            id="room-name"
            placeholder="A Casa do Lago"
            value={name}
            maxLength={40}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="master-nick">Seu apelido</Label>
          <Input
            id="master-nick"
            placeholder="Como te chamam na mesa?"
            value={nickname}
            maxLength={20}
            disabled={submitting}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="max-players">Máximo de jogadores</Label>
          <Select value={maxPlayers} onValueChange={setMaxPlayers} disabled={submitting}>
            <SelectTrigger id="max-players" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} jogadores
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-border flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="private">Sala privada</Label>
            <p className="text-muted-foreground text-xs">
              Apenas quem tem o código consegue entrar.
            </p>
          </div>
          <Switch
            id="private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            disabled={submitting}
          />
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button asChild variant="ghost" disabled={submitting}>
          <Link href="/">Cancelar</Link>
        </Button>
        <Button type="button" onClick={handleCreate} disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : <SparklesIcon />}
          Criar sala
        </Button>
      </CardFooter>
    </Card>
  );
}
