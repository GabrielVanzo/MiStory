# Black Stories

Jogo de enigmas multiplayer em tempo real. Um mestre conhece a história completa;
os demais jogadores fazem perguntas de "sim ou não" para desvendar o mistério.

> **Status:** ✅ MVP concluído — Etapas 1–15 — jogo jogável de ponta a ponta (setup, design system, layout, banco, tempo real, salas, enigmas, fluxo da partida, perguntas, chutes, pontuação, UX, segurança, refatoração, polimento).

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** + **[shadcn/ui](https://ui.shadcn.com)** (tema dark por padrão)
- **[Prisma 7](https://www.prisma.io)** + **SQLite** (driver adapter `better-sqlite3`)
- **[Socket.IO](https://socket.io)** — servidor de tempo real standalone (`server.ts`, via `tsx`)
- **ESLint** + **Prettier**

## Requisitos

- Node.js 18.18+ (recomendado: 20 ou 24)
- npm

## Setup

```bash
npm install          # instala deps e roda `prisma generate` (postinstall)
cp .env.example .env # variáveis de ambiente locais
npm run db:migrate   # aplica as migrations no banco SQLite (prisma/dev.db)
npm run db:seed      # carrega os 30 enigmas de `data/enigmas.ts` no banco
npm run dev          # sobe Next (:3000) + servidor Socket.IO (:3001) juntos
```

> `npm run dev` roda dois processos via `concurrently`: `dev:web` (Next) e
> `dev:socket` (servidor de tempo real). Portas/origem em `.env`.

## Scripts

| Script                 | Descrição                                 |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento               |
| `npm run build`        | Build de produção                         |
| `npm run start`        | Servidor de produção                      |
| `npm run lint`         | ESLint                                    |
| `npm run lint:fix`     | ESLint com correção automática            |
| `npm run format`       | Formata o projeto com Prettier            |
| `npm run format:check` | Verifica a formatação                     |
| `npm run typecheck`    | Checagem de tipos (`tsc --noEmit`)        |
| `npm run db:generate`  | Gera o Prisma Client                      |
| `npm run db:push`      | Sincroniza o schema com o banco           |
| `npm run db:seed`      | Popula o catálogo de enigmas              |
| `npm run db:migrate`   | Cria/aplica migrations em desenvolvimento |
| `npm run db:studio`    | Abre o Prisma Studio                      |

## Produção — o que saber antes de subir

- **Dois processos**: o app Next e o servidor Socket.IO (`server.ts`) são independentes.
  `npm start` sobe os dois; num deploy real cada um é um serviço (o realtime precisa de
  conexão persistente, então não vai em serverless).
- **Variáveis obrigatórias**: `DATABASE_URL`, `CLIENT_ORIGIN` (origem permitida no CORS),
  `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_SITE_URL`.
- **Banco**: SQLite serve bem um nó. O schema é portável — trocar para PostgreSQL é mudar
  o `provider` (veja o cabeçalho de `prisma/schema.prisma`). Rode `db:migrate` + `db:seed`.
- **Limitações conhecidas**:
  - O rate limit vive em memória, por nó → um deploy multi-nó precisa de um store
    compartilhado (Redis), e o Socket.IO precisaria de um adapter.
  - `start:socket` roda TypeScript via `tsx`. Funciona; compilar para JS é o passo natural
    se o boot precisar ser mais enxuto.
  - `/design` é o showcase interno do design system — continua acessível pela URL, mas
    deixou de ser anunciado na navegação do jogador.

## Arquitetura de pastas

```
app/         Rotas e layouts (App Router)
components/  UI reutilizável (ui/ = shadcn, layout/ = shell)
data/        Conteúdo estático (catálogo de enigmas)
features/    Módulos por domínio (room/ = toda a sala)
hooks/       React hooks compartilhados
lib/         Integrações de baixo nível (prisma, realtime client, cn)
server/      Código exclusivo do servidor — realtime/ concentra as regras de negócio
types/       Tipos e uniões compartilhados
utils/       Funções puras (formatação)
prisma/      Schema, migrations, seed e banco SQLite
```

O alias `@/*` aponta para a raiz do projeto (ex.: `@/lib/prisma`, `@/components/ui/button`).
