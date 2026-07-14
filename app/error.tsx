"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HomeIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Placeholder — error reporting will be wired in a later stage.
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      media={<TriangleAlertIcon />}
      mediaClassName="bg-destructive/10 text-destructive ring-destructive/20"
      eyebrow="Erro"
      title="Algo saiu do roteiro"
      description="Encontramos um problema inesperado. Você pode tentar novamente ou voltar ao início."
    >
      <Button onClick={reset}>
        <RotateCcwIcon /> Tentar novamente
      </Button>
      <Button asChild variant="outline">
        <Link href="/">
          <HomeIcon /> Início
        </Link>
      </Button>
    </StatusScreen>
  );
}
