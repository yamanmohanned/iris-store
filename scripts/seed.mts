/**
 * Seed the database.
 *   pnpm db:seed                    base data only (settings, delivery zones, pages, home layout)
 *   pnpm db:seed --demo             + demo catalog with generated images
 *   pnpm db:seed --country=SA       choose the country preset for a new store (IQ, SA, AE, KW, QA, BH, OM, JO, EG)
 */
import { closeDb } from "@/server/db/client";
import { seedBase, seedDemo } from "@/server/seed";

const args = process.argv.slice(2);
const country = args.find((a) => a.startsWith("--country="))?.split("=")[1];
const demo = args.includes("--demo");

const started = Date.now();
try {
  await seedBase({ country }, console.log);
  if (demo) await seedDemo(console.log);
  console.log(`✓ Seed finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} catch (error) {
  console.error("✖ Seed failed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
