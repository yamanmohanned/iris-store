/**
 * A missing or invalid setting (e.g. AUTH_SECRET) stops the production server right away with a
 * readable message, so the container restarts and the reason is in its log, instead of the server
 * starting and then failing every request.
 */
export async function checkEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  // `next build` loads instrumentation too, and builds run without runtime secrets.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { env } = await import("@/server/env");
  try {
    env();
  } catch (error) {
    process.stderr.write(`\n${(error as Error).message}\n\n`);
    process.exit(1);
  }
}
