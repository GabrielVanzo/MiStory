import Link from "next/link";
import {
  ArrowRightIcon,
  CrownIcon,
  LightbulbIcon,
  MessageCircleQuestionIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: CrownIcon,
    title: "O Mestre narra",
    description: "Um jogador conhece a história completa e conduz o mistério para a mesa.",
  },
  {
    icon: MessageCircleQuestionIcon,
    title: "Os detetives investigam",
    description: "Todos fazem perguntas de sim ou não para reunir pistas em tempo real.",
  },
  {
    icon: LightbulbIcon,
    title: "O enigma se revela",
    description: "Juntos, os jogadores reconstroem a verdade por trás da cena sombria.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
        <Badge variant="secondary" className="gap-1.5">
          <SparklesIcon /> Multiplayer em tempo real
        </Badge>

        <div className="flex flex-col items-center gap-5">
          <h1 className="text-gradient-brand max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
            Desvende histórias sombrias
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-balance sm:text-xl">
            Reúna amigos, faça as perguntas certas e resolva enigmas de mistério juntos — cada
            resposta é apenas sim ou não.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/criar">
              Criar sala <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/entrar">Entrar com código</Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Grátis para jogar · Sem cadastro · 2 a 8 jogadores
        </p>
      </section>

      {/* Como jogar */}
      <section id="como-jogar" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <Badge variant="info">Como jogar</Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Três passos para o mistério
          </h2>
          <p className="text-muted-foreground max-w-lg text-balance">
            Sem tabuleiro, sem cartas físicas. Só a sua mesa e um bom enigma.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="bg-primary/15 text-primary ring-primary/25 flex size-11 items-center justify-center rounded-xl ring-1">
                  <step.icon className="size-5" />
                </div>
                <CardTitle className="mt-3 flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-sm">0{index + 1}</span>
                  {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <Card className="surface-glass ring-primary/15 items-center gap-6 px-6 py-14 text-center">
          <CardContent className="flex flex-col items-center gap-6">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
              Pronto para a primeira investigação?
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/criar">
                  Criar sala <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/entrar">Entrar com código</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
