import Link from "next/link";
import { GhostIcon, HomeIcon } from "lucide-react";

import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      media={<GhostIcon />}
      eyebrow="404"
      title="Página não encontrada"
      description="O rastro esfriou. A página que você procura não existe ou foi movida para outro lugar."
    >
      <Button asChild>
        <Link href="/">
          <HomeIcon /> Voltar ao início
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/entrar">Entrar em uma sala</Link>
      </Button>
    </StatusScreen>
  );
}
