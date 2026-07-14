import type { Metadata } from "next";
import { WrenchIcon } from "lucide-react";

import { StatusScreen } from "@/components/layout/status-screen";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Em manutenção",
};

export default function ManutencaoPage() {
  return (
    <StatusScreen
      media={<WrenchIcon />}
      mediaClassName="bg-warning/10 text-warning ring-warning/20"
      title="Em manutenção"
      description="Estamos preparando algo melhor para a sua próxima investigação. Voltamos em breve."
    >
      <Badge variant="warning">Previsão: em breve</Badge>
    </StatusScreen>
  );
}
