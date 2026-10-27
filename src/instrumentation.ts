export async function register() {
  // The NEXT_RUNTIME check must wrap the import directly so the Edge bundle
  // never includes Node-only modules (twilio, node-cron, prisma).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
