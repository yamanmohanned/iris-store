import "server-only";
import { after } from "next/server";
import { logger } from "@/server/logger";

/**
 * Run work after the response is sent (e.g. emails), so timing never reveals whether an account
 * exists and slow providers never block the user. Falls back to a detached promise outside a request.
 */
export function runInBackground(label: string, task: () => Promise<unknown>) {
  const run = () =>
    task().catch((err) => {
      logger.error({ err, label }, "background task failed");
    });
  if (process.env.NEXT_RUNTIME) {
    try {
      after(run);
      return;
    } catch {
      // Not inside a request scope (e.g. a script): run detached below.
    }
  }
  void run();
}
