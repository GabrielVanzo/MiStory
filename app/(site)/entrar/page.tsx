import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";

import { JoinRoomForm } from "@/features/room/join-room-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Entrar em uma sala",
};

const publicRooms = [
  { code: "LAGO-7X2K", name: "A Casa do Lago", players: 4, max: 8 },
  { code: "TREM-91QP", name: "O Último Trem", players: 6, max: 6 },
  { code: "FARO-33LM", name: "O Farol Silencioso", players: 2, max: 5 },
];

export default function EntrarSalaPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Voltar
      </Link>

      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar em uma sala</h1>
        <p className="text-muted-foreground text-sm">
          Use um código de convite ou escolha uma sala pública.
        </p>
      </div>

      <Tabs defaultValue="codigo">
        <TabsList className="w-full">
          <TabsTrigger value="codigo">Com código</TabsTrigger>
          <TabsTrigger value="publicas">Salas públicas</TabsTrigger>
        </TabsList>

        {/* Entrar com código (wired) */}
        <TabsContent value="codigo" className="mt-5">
          <JoinRoomForm />
        </TabsContent>

        {/* Salas públicas — listagem ilustrativa (feature futura) */}
        <TabsContent value="publicas" className="mt-5 space-y-3">
          {publicRooms.map((room) => {
            const isFull = room.players >= room.max;
            return (
              <Card key={room.code} size="sm">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{room.name}</p>
                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                      <span className="font-mono">{room.code}</span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="size-3" />
                        {room.players}/{room.max}
                      </span>
                    </div>
                  </div>
                  <Badge variant={isFull ? "secondary" : "outline"}>
                    {isFull ? "Cheia" : "Em breve"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
          <p className="text-muted-foreground pt-1 text-center text-xs">
            As salas listadas são apenas ilustrativas nesta fase.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
