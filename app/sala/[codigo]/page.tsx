import type { Metadata } from "next";

import { RoomProvider } from "@/features/room/room-provider";
import { RoomView } from "@/features/room/room-view";

export const metadata: Metadata = {
  title: "Sala",
};

export default async function SalaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = codigo.toUpperCase();

  return (
    <RoomProvider code={code}>
      <RoomView />
    </RoomProvider>
  );
}
