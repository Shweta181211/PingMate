import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchRecentEmails, toGmailAccessError } from "@/lib/gmail";
import { analyzePendingEmails } from "@/lib/email-processing";
import { processDueReminders } from "@/lib/reminder-scheduler";

// A first scan fetches and classifies up to 100 emails; the default
// serverless timeout is too short for that.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Create defaults before processing so first-time scans can schedule
    // reminders immediately, even before the WhatsApp number is verified.
    await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const emails = await fetchRecentEmails(userId, 100);

    // Store new emails first; analysis below works through everything that
    // still needs an AI pass, including emails from earlier scans.
    const known = new Set(
      (
        await prisma.email.findMany({
          where: { gmailId: { in: emails.map((e) => e.gmailId) } },
          select: { gmailId: true },
        })
      ).map((e) => e.gmailId)
    );
    const fresh = emails.filter((e) => !known.has(e.gmailId));
    if (fresh.length > 0) {
      await prisma.email.createMany({
        data: fresh.map((e) => ({ ...e, userId })),
        skipDuplicates: true,
      });
    }

    const analysis = await analyzePendingEmails({ userId, budgetMs: 45_000 });

    await prisma.userSettings.update({
      where: { userId },
      data: { lastGmailSync: new Date(), gmailConnected: true },
    });

    // Recruitsage CUSTOM alerts are scheduled for now. Dispatch them in the
    // same scan; regular future reminders go through the reminder cron.
    const reminderResult = await processDueReminders();

    const summary = {
      scanned: emails.length,
      newEmails: fresh.length,
      processed: analysis.analyzed,
      opportunitiesFound: analysis.opportunitiesFound,
      recruitsageUpdates: analysis.recruitsageUpdates,
      pendingAnalysis: analysis.remaining,
      rateLimited: analysis.rateLimited,
      remindersSent: reminderResult.sent,
      remindersFailed: reminderResult.failed,
    };
    console.info("[gmail-sync]", summary);
    return NextResponse.json(summary);
  } catch (error) {
    const gmailError = toGmailAccessError(error);
    if (gmailError) {
      console.error("[gmail-sync] failed:", gmailError.code);
      await prisma.userSettings.upsert({
        where: { userId },
        update: { gmailConnected: false },
        create: { userId, gmailConnected: false },
      });
      return NextResponse.json(
        { code: gmailError.code, error: gmailError.message },
        { status: gmailError.code === "GMAIL_API_DISABLED" ? 503 : 401 }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gmail-sync] failed", error);
    return NextResponse.json(
      { error: `Gmail scan could not finish: ${message.slice(0, 300)}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = await prisma.email.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: "desc" },
    take: 20,
    select: {
      id: true,
      subject: true,
      sender: true,
      senderEmail: true,
      snippet: true,
      receivedAt: true,
      analyzed: true,
      opportunity: {
        select: { id: true, category: true, title: true },
      },
    },
  });

  return NextResponse.json(emails);
}
