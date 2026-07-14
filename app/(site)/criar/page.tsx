import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { CreateRoomForm } from "@/features/room/create-room-form";

export const metadata: Metadata = {
  title: "Criar sala",
};

export default function CriarSalaPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Voltar
      </Link>

      <CreateRoomForm />
    </div>
  );
}
