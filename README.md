# Black Stories

Jogo de enigmas multiplayer em tempo real. Um mestre conhece a história completa;
os demais jogadores fazem perguntas de "sim ou não" para desvendar o mistério.

> **Status:** MVP em construção — Etapas 1–5 concluídas (setup, design system, layout, banco de dados, tempo real).

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
| `npm run db:migrate`   | Cria/aplica migrations em desenvolvimento |
| `npm run db:studio`    | Abre o Prisma Studio                      |

## Arquitetura de pastas

```
app/         Rotas e layouts (App Router)
components/  Componentes de UI reutilizáveis (ui/ = shadcn)
features/    Módulos por domínio/funcionalidade
hooks/       React hooks compartilhados
lib/         Integrações e utilitários de baixo nível (prisma, cn)
server/      Código exclusivo do servidor (actions, orquestração)
services/    Regras de negócio / casos de uso
types/       Tipos TypeScript compartilhados
utils/       Funções utilitárias puras
prisma/      Schema e banco SQLite
```

O alias `@/*` aponta para a raiz do projeto (ex.: `@/lib/prisma`, `@/components/ui/button`).
