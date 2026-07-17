# MiStory

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

- **Node.js 24 (LTS)** — fixado em `.nvmrc` e em `engines`. Com nvm: `nvm use` na raiz.
  A versão é a mesma nos três lugares — `.nvmrc`, `engines` e o `Dockerfile` — de propósito:
  é a maior que a Vercel suporta, é LTS, e manter tudo alinhado evita o erro de ABI abaixo.
- npm

> ⚠️ **Sempre `nvm use` antes de `npm run dev`.**
> O `better-sqlite3` é um módulo **nativo**: o binário é compilado contra o ABI de uma
> versão específica do Node. Na versão errada, o servidor de tempo real *sobe* mas toda
> operação de banco falha — o jogo parece no ar e está quebrado.
> Um guard (`scripts/check-node.mjs`, rodado no `predev`) barra isso com uma mensagem
> clara antes de qualquer coisa iniciar. Se quiser ficar numa versão diferente do
> `.nvmrc`, é só `npm rebuild better-sqlite3`.

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

## Deploy

> ⚠️ **A Vercel sozinha NÃO roda este projeto.** O jogo são dois processos: as páginas
> (Next) e o **servidor de tempo real** (`server.ts`). WebSocket precisa de um processo que
> fica de pé; serverless acorda, responde e morre. A Vercel serve muito bem o primeiro e
> não consegue rodar o segundo. Sem o segundo, criar sala falha com
> *"Não foi possível conectar ao servidor"*.

Arquitetura em produção:

```
   navegador ──HTTP──►  Vercel (Next)          páginas, sem banco
        │
        └─────WS───►  Railway/Fly/Render      server.ts + volume com o SQLite
                       (processo persistente)
```

### 1. Servidor de tempo real (Railway, Fly ou Render — precisa de volume)

Use o `Dockerfile` da raiz (só o realtime; não builda o Next).

- **Volume**: monte em `/data`. É onde o banco vive — sem volume, os dados somem a cada deploy.
- **Porta**: `3001` (exposta na imagem).
- **Variáveis**:
  | Variável | Valor |
  | --- | --- |
  | `DATABASE_URL` | `file:/data/prod.db` (já é o default da imagem) |
  | `CLIENT_ORIGIN` | origens do navegador, **separadas por vírgula**: `https://seu-app.vercel.app,https://seudominio.com.br` |

  `PORT` é injetada pela plataforma e o servidor a respeita automaticamente — não precisa setar.

No primeiro boot a imagem roda `migrate deploy` + `db seed` sozinha (ambos idempotentes).
Confirme com `https://SEU-SOCKET/health` → `{"ok":true}`.

### 2. App Next (Vercel)

Variáveis no projeto da Vercel:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | a URL pública do servidor de tempo real (`https://...`) |
| `NEXT_PUBLIC_SITE_URL` | a URL da Vercel |

> `NEXT_PUBLIC_*` é lido **no build**. Depois de mudar, faça **redeploy** — não basta salvar.
> Se `NEXT_PUBLIC_SOCKET_URL` faltar, o navegador tenta `http://localhost:3001` (a máquina do
> jogador) e falha — foi exatamente esse o sintoma.

`DATABASE_URL` **não** é necessário na Vercel: o app Next nunca toca o banco.

### 3. Checklist quando "não conecta"

1. `https://SEU-SOCKET/health` responde `{"ok":true}`?
2. `NEXT_PUBLIC_SOCKET_URL` está setado **e** houve redeploy depois disso?
3. `CLIENT_ORIGIN` no socket é **exatamente** a origem da Vercel (protocolo, sem barra final)?
4. Site em `https` e socket em `http`? O navegador bloqueia (mixed content) — o socket
   precisa de `https`.

### Limites deste setup

- **Uma instância só.** O SQLite no volume e o rate limit em memória assumem um nó. Para
  escalar horizontalmente: migrar para PostgreSQL (o schema já é portável — veja o cabeçalho
  de `prisma/schema.prisma`) e adicionar um adapter do Socket.IO (Redis).
- Sem backup automático do volume — configure snapshots no host se os dados importarem.

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
