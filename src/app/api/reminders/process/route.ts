import { NextRequest, NextResponse } from "next/server";
import { processDueReminders, markMissedOpportunities } from "@/lib/reminder-scheduler";
import { analyzePendingEmails } from "@/lib/email-processing";

export const maxDuration = 60;

// This route is called by a cron job (Vercel Cron or external)
export async function POST(req: NextRequest) {
  // Secure with a secret key
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueReminders();
    await markMissedOpportunities();
    const analysis = await analyzePendingEmails({ budgetMs: 30_000 });
    return NextResponse.json({ success: true, ...result, analysis });
  } catch (error: any) {
    console.error("Reminder processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET for Vercel Cron (uses GET requests)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueReminders();
    await markMissedOpportunities();
    const analysis = await analyzePendingEmails({ budgetMs: 30_000 });
    return NextResponse.json({ success: true, ...result, analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
