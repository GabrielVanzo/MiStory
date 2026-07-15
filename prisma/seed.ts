import "dotenv/config";

import { ENIGMAS } from "../data/enigmas";
import { prisma } from "../lib/prisma";

/**
 * Seeds the enigma catalog from the local file into the database.
 * Idempotent: upserts by `slug`, so re-running updates existing content.
 */
async function main(): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const enigma of ENIGMAS) {
    const existing = await prisma.enigma.findUnique({
      where: { slug: enigma.id },
      select: { id: true },
    });

    await prisma.enigma.upsert({
      where: { slug: enigma.id },
      create: {
        slug: enigma.id,
        title: enigma.title,
        teaser: enigma.intro,
        solution: enigma.answer,
        explanation: enigma.explanation,
        difficulty: enigma.level,
        language: "pt-BR",
        isPublished: true,
      },
      update: {
        title: enigma.title,
        teaser: enigma.intro,
        solution: enigma.answer,
        explanation: enigma.explanation,
        difficulty: enigma.level,
      },
    });

    if (existing) updated++;
    else created++;
  }

  const total = await prisma.enigma.count();
  console.log(`[seed] enigmas: ${created} created, ${updated} updated (${total} total)`);
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
