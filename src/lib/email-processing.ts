import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AiRateLimitedError, analyzeEmail } from "./ai";
import { isRecruitsageEmail } from "./recruitsage";
import { scheduleRecruitsageAlert, scheduleRemindersForOpportunity } from "./reminder-scheduler";

export type AnalysisRunResult = {
  analyzed: number;
  opportunitiesFound: number;
  recruitsageUpdates: number;
  remaining: number;
  rateLimited: boolean;
};

// One run at a time per process: the Gmail scan and the background cron can
// otherwise classify the same email twice.
const g = globalThis as { __pingmateAnalysisRunning?: boolean };

/**
 * Classify stored emails that have not been through the AI model yet.
 * Groq's free tier allows only a few emails per minute, so this works within
 * a time budget and stops on a rate limit; the rest is picked up by the next
 * scan or by the background reminder cron.
 */
export async function analyzePendingEmails(
  options: { userId?: string; budgetMs?: number } = {}
): Promise<AnalysisRunResult> {
  const result: AnalysisRunResult = {
    analyzed: 0,
    opportunitiesFound: 0,
    recruitsageUpdates: 0,
    remaining: 0,
    rateLimited: false,
  };
  const where = { aiAnalyzed: false, ...(options.userId ? { userId: options.userId } : {}) };

  if (g.__pingmateAnalysisRunning) {
    result.remaining = await prisma.email.count({ where });
    return result;
  }
  g.__pingmateAnalysisRunning = true;

  try {
    const startedAt = Date.now();
    const budgetMs = options.budgetMs ?? 40_000;
    const pending = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: { opportunity: true },
    });

    for (const email of pending) {
      if (Date.now() - startedAt > budgetMs) break;

      let analysis;
      try {
        analysis = await analyzeEmail(
          email.subject,
          email.body,
          email.sender,
          email.senderEmail,
          email.receivedAt
        );
      } catch (error) {
        if (error instanceof AiRateLimitedError) {
          result.rateLimited = true;
          break;
        }
        throw error;
      }

      const outcome = await saveAnalysis(email, analysis);
      result.analyzed++;
      if (outcome.opportunity) result.opportunitiesFound++;
      if (outcome.recruitsageAlert) result.recruitsageUpdates++;
    }

    result.remaining = await prisma.email.count({ where });
    return result;
  } finally {
    g.__pingmateAnalysisRunning = false;
  }
}

type StoredEmail = Prisma.EmailGetPayload<{ include: { opportunity: true } }>;

// Only fresh portal notices deserve an instant WhatsApp alert; re-analysing
// months-old emails must not flood the user.
const RECRUITSAGE_ALERT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

async function saveAnalysis(email: StoredEmail, analysis: Awaited<ReturnType<typeof analyzeEmail>>) {
  const userId = email.userId;
  const existing = email.opportunity;

  await prisma.email.update({
    where: { id: email.id },
    // Keyword guesses (no key / AI error) stay eligible for a later AI pass.
    data: { analyzed: true, aiAnalyzed: analysis.source !== "fallback" },
  });

  if (!analysis.isOpportunity || !analysis.title) {
    // An earlier keyword guess the AI rejects is noise, unless the user has
    // already acted on it.
    if (existing && existing.status === "PENDING" && !existing.deadline && !existing.notes) {
      await prisma.opportunity.delete({ where: { id: existing.id } });
    }
    return { opportunity: false, recruitsageAlert: false };
  }

  let deadline: Date | null = null;
  if (analysis.deadline) {
    const parsed = new Date(analysis.deadline);
    if (!Number.isNaN(parsed.getTime())) deadline = parsed;
  }

  const fields = {
    title: analysis.title,
    companyName: analysis.companyName || null,
    category: analysis.category || "OTHER",
    deadline,
    registrationLink: analysis.registrationLink || null,
    actionRequired: analysis.actionRequired || null,
    priority: analysis.priority || "MEDIUM",
  };

  const opportunity = existing
    ? await prisma.opportunity.update({
        where: { id: existing.id },
        data: {
          ...fields,
          // Keep the user's decision, but a newly found future deadline
          // revives an opportunity that was only "missed" for lack of one.
          ...(existing.status === "MISSED" && deadline && deadline > new Date()
            ? { status: "PENDING" as const }
            : {}),
        },
      })
    : await prisma.opportunity.create({ data: { userId, emailId: email.id, ...fields } });

  if (deadline) await scheduleRemindersForOpportunity(opportunity.id, userId);

  let recruitsageAlert = false;
  if (isRecruitsageEmail(email) && Date.now() - email.receivedAt.getTime() < RECRUITSAGE_ALERT_WINDOW_MS) {
    recruitsageAlert = await scheduleRecruitsageAlert(opportunity.id, userId);
  }
  return { opportunity: true, recruitsageAlert };
}
