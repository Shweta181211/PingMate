import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  // Day boundaries in India time, independent of the server timezone.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nowIst = Date.now() + IST_OFFSET_MS;
  const todayStart = new Date(nowIst - (nowIst % DAY_MS) - IST_OFFSET_MS);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS - 1);
  const weekEnd = new Date(todayEnd.getTime() + 7 * DAY_MS);

  const [
    total,
    upcoming,
    todayDeadlines,
    thisWeek,
    applied,
    missed,
    settings,
    upcomingReminders,
    pendingAnalysis,
  ] = await Promise.all([
    prisma.opportunity.count({ where: { userId } }),
    prisma.opportunity.count({
      where: {
        userId,
        status: "PENDING",
        deadline: { gte: new Date() },
      },
    }),
    prisma.opportunity.findMany({
      where: {
        userId,
        status: "PENDING",
        deadline: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.opportunity.findMany({
      where: {
        userId,
        status: "PENDING",
        deadline: { gte: todayStart, lte: weekEnd },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.opportunity.count({ where: { userId, status: "APPLIED" } }),
    prisma.opportunity.count({ where: { userId, status: "MISSED" } }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: {
        whatsappVerified: true,
        gmailConnected: true,
        remindersEnabled: true,
        lastGmailSync: true,
        whatsappLastError: true,
      },
    }),
    prisma.reminder.findMany({
      where: { userId, status: "PENDING", opportunity: { status: "PENDING" } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      select: {
        id: true,
        type: true,
        scheduledAt: true,
        opportunity: { select: { title: true, deadline: true } },
      },
    }),
    prisma.email.count({ where: { userId, aiAnalyzed: false } }),
  ]);

  return NextResponse.json({
    stats: { total, upcoming, applied, missed },
    todayDeadlines,
    thisWeek,
    settings,
    upcomingReminders,
    pendingAnalysis,
  });
}
