/** Runs once when a server starts (see Next.js "instrumentation"). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnvironment } = await import("./instrumentation-node");
    await checkEnvironment();
  }
}
