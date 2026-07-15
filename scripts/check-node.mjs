/**
 * Fails fast when the running Node major does not match `.nvmrc`.
 *
 * WHY: `better-sqlite3` is a native module — its binary is compiled against one
 * Node ABI. Run the realtime server on a different major and every database call
 * throws `NODE_MODULE_VERSION ... requires ...`, while the server still reports
 * "listening". The game looks up and is completely broken: the worst failure
 * mode there is. Forty lines of Prisma stack trace do not say "wrong Node", so
 * this turns that into one actionable sentence, before anything starts.
 *
 * Only guards the processes that actually load the native module (the realtime
 * server). `next build` never touches better-sqlite3, so it is not gated.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const wanted = readFileSync(join(root, ".nvmrc"), "utf8").trim();
const wantedMajor = wanted.split(".")[0];
const currentMajor = process.versions.node.split(".")[0];

// Only the major matters: the ABI is stable within a major, and hosts pin majors
// (Vercel gives "24.x", the Docker image is node:24-slim).
if (currentMajor !== wantedMajor) {
  const red = "\x1b[31m";
  const yellow = "\x1b[33m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";

  console.error(`
${red}${bold}✖ Node errado para este projeto.${reset}

  Você está no  ${bold}v${process.versions.node}${reset}
  O projeto usa ${bold}v${wanted}${reset}  (definido no .nvmrc)

${yellow}Por quê isso importa:${reset} o better-sqlite3 é um módulo nativo, compilado
  para uma versão específica do Node. Rodando na versão errada, o servidor
  de tempo real sobe mas TODA operação de banco falha.

${bold}Resolva com uma das duas:${reset}

  ${bold}nvm use${reset}                        ← recomendado (usa a versão do projeto)
  ${bold}npm rebuild better-sqlite3${reset}     ← se quiser ficar na v${currentMajor}
`);
  process.exit(1);
}
