"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";

import { joinRoom, realtimeErrorMessage } from "@/lib/realtime/actions";
import { saveIdentity } from "@/lib/realtime/identity";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleJoin() {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || !nickname.trim()) {
      toast.error("Informe o código da sala e seu apelido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await joinRoom({ code: normalizedCode, nickname });
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
      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="code">Código da sala</Label>
          <div className="relative">
            <KeyRoundIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              id="code"
              placeholder="XXXX-XXXX"
              value={code}
              maxLength={12}
              disabled={submitting}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="pl-8 text-center font-mono tracking-[0.3em] uppercase"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nick">Seu apelido</Label>
          <Input
            id="nick"
            placeholder="Como te chamam na mesa?"
            value={nickname}
            maxLength={20}
            disabled={submitting}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <Button type="button" className="w-full" onClick={handleJoin} disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : null}
          Entrar
          {!submitting ? <ArrowRightIcon /> : null}
        </Button>
      </CardContent>
    </Card>
  );
}
