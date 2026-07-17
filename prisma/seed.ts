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
        // JSON-encoded string[] — SQLite has no array type (see schema note).
        hints: JSON.stringify(enigma.hints ?? []),
        difficulty: enigma.level,
        language: "pt-BR",
        isPublished: true,
      },
      update: {
        title: enigma.title,
        teaser: enigma.intro,
        solution: enigma.answer,
        explanation: enigma.explanation,
        hints: JSON.stringify(enigma.hints ?? []),
        difficulty: enigma.level,
        // Re-publish in case it had been retired before and came back.
        isPublished: true,
      },
    });

    if (existing) updated++;
    else created++;
  }

  // Retire enigmas that were removed/renamed in the file (e.g. a broken puzzle
  // replaced by a new one). We DON'T delete: a past round may reference it via
  // a Restrict FK. Setting isPublished=false just keeps it out of new draws
  // while its history survives.
  const slugs = ENIGMAS.map((enigma) => enigma.id);
  const retired = await prisma.enigma.updateMany({
    where: { slug: { notIn: slugs }, isPublished: true },
    data: { isPublished: false },
  });

  const total = await prisma.enigma.count();
  const published = await prisma.enigma.count({ where: { isPublished: true } });
  console.log(
    `[seed] enigmas: ${created} created, ${updated} updated, ${retired.count} retired ` +
      `(${published} published / ${total} total)`,
  );
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
