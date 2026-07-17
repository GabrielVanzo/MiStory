"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GhostIcon,
  KeyRoundIcon,
  MailIcon,
  MessageCircleQuestionIcon,
  PlusIcon,
  SearchIcon,
  SkullIcon,
  SparklesIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ className, name, token }: { className: string; name: string; token: string }) {
  return (
    <div className="space-y-1.5">
      <div className={cn("ring-border h-16 rounded-lg ring-1 ring-inset", className)} />
      <div className="text-sm font-medium">{name}</div>
      <div className="text-muted-foreground font-mono text-xs">{token}</div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      {/* Hero */}
      <header className="space-y-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          ← Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <SparklesIcon /> Design System
          </Badge>
          <Badge variant="info">v0.1</Badge>
        </div>
        <h1 className="text-gradient-brand text-5xl font-semibold tracking-tight">MiStory</h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">
          Identidade visual premium — paleta, tipografia e componentes. Inspiração: Discord, Linear,
          Notion, Riot e Steam.
        </p>
      </header>

      <div className="mt-14 space-y-16">
        {/* Palette */}
        <Section
          title="Paleta de cores"
          description="Base noir com assinatura em violeta e cores semânticas. Tokens em OKLCH."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <Swatch className="bg-background" name="Background" token="--background" />
            <Swatch className="bg-card" name="Card" token="--card" />
            <Swatch className="bg-muted" name="Muted" token="--muted" />
            <Swatch className="bg-accent" name="Accent" token="--accent" />
            <Swatch className="bg-primary" name="Primary" token="--primary" />
            <Swatch className="bg-secondary" name="Secondary" token="--secondary" />
            <Swatch className="bg-success" name="Success" token="--success" />
            <Swatch className="bg-warning" name="Warning" token="--warning" />
            <Swatch className="bg-info" name="Info" token="--info" />
            <Swatch className="bg-destructive" name="Destructive" token="--destructive" />
            <Swatch className="bg-border" name="Border" token="--border" />
            <Swatch className="bg-foreground" name="Foreground" token="--foreground" />
          </div>
        </Section>

        {/* Typography */}
        <Section
          title="Tipografia"
          description="Geist Sans para interface e títulos; Geist Mono para dados e códigos."
        >
          <div className="space-y-4">
            <p className="text-gradient-brand text-5xl font-semibold tracking-tight">
              Display · 48px
            </p>
            <h1 className="text-4xl font-semibold">Heading 1 · 36px</h1>
            <h2 className="text-2xl font-semibold">Heading 2 · 24px</h2>
            <h3 className="text-xl font-medium">Heading 3 · 20px</h3>
            <p className="text-base">
              Body · 16px — Reúna amigos, faça perguntas de sim ou não e desvende histórias
              sombrias.
            </p>
            <p className="text-muted-foreground text-sm">
              Small / muted · 14px — texto de apoio e legendas.
            </p>
            <p className="font-mono text-sm">Mono · SALA-7X2K · 14px</p>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Botões" description="Variantes, tamanhos e estados.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Adicionar">
                <PlusIcon />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>
                <SparklesIcon /> Com ícone
              </Button>
              <Button variant="outline">
                Continuar <ArrowRightIcon />
              </Button>
              <Button disabled>
                <Spinner size="sm" /> Carregando
              </Button>
              <Button variant="secondary" disabled>
                Desabilitado
              </Button>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges" description="Rótulos de status e categorias.">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">
              <SparklesIcon /> Success
            </Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="ghost">Ghost</Badge>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs" description="Campos de formulário e estados.">
          <div className="grid max-w-xl gap-5">
            <div className="grid gap-2">
              <Label htmlFor="nick">Apelido</Label>
              <Input id="nick" placeholder="Como te chamam na mesa?" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="search">Com ícone</Label>
              <div className="relative">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input id="search" className="pl-8" placeholder="Buscar sala..." />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha da sala</Label>
              <div className="relative">
                <KeyRoundIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="px-8"
                  defaultValue="enigma"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invalid">Estado inválido</Label>
              <Input id="invalid" aria-invalid defaultValue="valor inválido" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="disabled">Desabilitado</Label>
              <Input id="disabled" disabled placeholder="Indisponível" />
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" description="Superfícies de conteúdo.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sala do Mistério</CardTitle>
                <CardDescription>4 de 8 detetives conectados</CardDescription>
                <CardAction>
                  <Badge variant="success">Aberta</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Um corpo, uma sala trancada por dentro e nenhuma arma à vista.
              </CardContent>
              <CardFooter className="justify-between">
                <AvatarGroup>
                  <Avatar size="sm">
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>BR</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <AvatarGroupCount>+2</AvatarGroupCount>
                </AvatarGroup>
                <Button size="sm">
                  Entrar <ArrowRightIcon />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Como jogar</CardTitle>
                <CardDescription>Regras em 3 passos</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2 text-sm">
                <p>1. O mestre conhece a história completa.</p>
                <p>2. Os detetives fazem perguntas de sim ou não.</p>
                <p>3. Desvendem o enigma juntos.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <MessageCircleQuestionIcon /> Ver tutorial
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* Avatars */}
        <Section title="Avatar" description="Tamanhos, fallback, status e grupos.">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>BS</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage src="https://i.pravatar.cc/80?img=12" alt="" />
                <AvatarFallback>ML</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarFallback>
                  <SkullIcon className="size-5" />
                </AvatarFallback>
                <AvatarBadge className="bg-success" />
              </Avatar>
            </div>
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>B</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>C</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+5</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </Section>

        {/* Dialog / Modal + Alert Dialog */}
        <Section title="Dialog & Modal" description="Modal padrão e diálogo de confirmação.">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon /> Criar sala
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar nova sala</DialogTitle>
                  <DialogDescription>Defina um nome e convide seus detetives.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="room-name">Nome da sala</Label>
                  <Input id="room-name" placeholder="A Casa do Lago" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Criar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2Icon /> Encerrar sala
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Encerrar a sala?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os detetives serão desconectados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction>Encerrar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        {/* Toasts */}
        <Section title="Toasts" description="Notificações efêmeras (Sonner).">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => toast.success("Sala criada com sucesso!")}>
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Um novo detetive entrou na sala.")}
            >
              Info
            </Button>
            <Button variant="outline" onClick={() => toast.warning("A sala fecha em 1 minuto.")}>
              Warning
            </Button>
            <Button variant="outline" onClick={() => toast.error("Não foi possível conectar.")}>
              Error
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast("Convite copiado", {
                  description: "Cole o link para chamar seus amigos.",
                  icon: <CopyIcon className="size-4" />,
                })
              }
            >
              Com descrição
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
                  loading: "Entrando na sala...",
                  success: "Conectado!",
                  error: "Falhou.",
                })
              }
            >
              Promise
            </Button>
          </div>
        </Section>

        {/* Loader */}
        <Section title="Loader" description="Indicador de carregamento.">
          <div className="flex flex-wrap items-center gap-8">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="default" />
            <Spinner size="lg" />
            <Spinner size="xl" className="text-primary" />
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner size="sm" /> Carregando salas...
            </div>
          </div>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton" description="Placeholders de carregamento.">
          <Card className="max-w-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        </Section>

        {/* Empty State */}
        <Section title="Empty State" description="Estados sem conteúdo.">
          <EmptyState className="max-w-md">
            <EmptyStateMedia>
              <GhostIcon />
            </EmptyStateMedia>
            <EmptyStateTitle>Nenhuma sala por aqui</EmptyStateTitle>
            <EmptyStateDescription>
              Crie a primeira sala e convide seus amigos para começar a investigar.
            </EmptyStateDescription>
            <EmptyStateContent>
              <Button>
                <PlusIcon /> Criar sala
              </Button>
              <Button variant="outline">
                <UsersIcon /> Entrar com código
              </Button>
            </EmptyStateContent>
          </EmptyState>
        </Section>

        {/* Tooltip + Separator */}
        <Section title="Tooltip & Separator" description="Dicas contextuais e divisórias.">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Notificações">
                  <BellIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notificações</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-8" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Convidar">
                  <MailIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Convidar detetives</TooltipContent>
            </Tooltip>
          </div>
        </Section>
      </div>
    </div>
  );
}
