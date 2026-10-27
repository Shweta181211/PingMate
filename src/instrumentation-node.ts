import cron from "node-cron";
import { processDueReminders, markMissedOpportunities } from "./lib/reminder-scheduler";
import { analyzePendingEmails } from "./lib/email-processing";

// Only for local / self-hosted Node servers. On Vercel the cron (vercel.json)
// or an external scheduler calls /api/reminders/process instead.
const g = globalThis as { __pingmateCron?: boolean; __pingmateCronBusy?: boolean };

if (!process.env.VERCEL && !g.__pingmateCron) {
  g.__pingmateCron = true;

  cron.schedule("* * * * *", async () => {
    if (g.__pingmateCronBusy) return;
    g.__pingmateCronBusy = true;
    try {
      const r = await processDueReminders();
      await markMissedOpportunities();
      if (r.total > 0) console.log("[reminder-cron]", r);

      // Groq's free tier only allows a few emails per minute, so large scans
      // finish here in the background, a batch each minute.
      const a = await analyzePendingEmails({ budgetMs: 40_000 });
      if (a.analyzed > 0) console.log("[analysis-cron]", a);
    } catch (e) {
      console.error("[reminder-cron] failed", e);
    } finally {
      g.__pingmateCronBusy = false;
    }
  });
  console.log("[reminder-cron] local reminder scheduler started (every minute)");
}
