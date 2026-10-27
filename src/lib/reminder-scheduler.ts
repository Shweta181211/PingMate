import { prisma } from "./prisma";
import { sendWhatsAppMessage, buildReminderMessage } from "./whatsapp";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** The instant at HH:mm India time, `dayOffset` days from `date`'s IST
 * calendar day. Independent of the server timezone (Vercel runs in UTC). */
function istTimeOnDay(date: Date, dayOffset: number, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + dayOffset, hours || 0, minutes || 0) -
      IST_OFFSET_MS
  );
}

type ReminderKind = "DAY_BEFORE" | "SAME_DAY_MORNING" | "FOUR_HOURS_BEFORE";

export async function scheduleRemindersForOpportunity(
  opportunityId: string,
  userId: string
) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity?.deadline) return 0;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Delete old pending deadline reminders for this opportunity (Recruitsage
  // CUSTOM alerts are managed separately and must survive a reschedule).
  await prisma.reminder.deleteMany({
    where: { opportunityId, status: "PENDING", type: { not: "CUSTOM" } },
  });

  // Scheduling must not depend on WhatsApp being verified yet. Otherwise a
  // first scan loses every reminder forever; delivery is gated separately.
  if (!settings.remindersEnabled || opportunity.status !== "PENDING") return 0;

  const deadline = opportunity.deadline;
  const now = new Date();
  const hoursBefore = settings.reminderHoursBefore;

  // Most urgent first: when two reminders would land within 30 minutes of
  // each other, only the more urgent one is kept.
  const candidates: Array<{ type: ReminderKind; at: Date; enabled: boolean }> = [
    {
      type: "FOUR_HOURS_BEFORE",
      at: new Date(deadline.getTime() - hoursBefore * 60 * MINUTE),
      enabled: settings.reminderFourHours,
    },
    {
      type: "SAME_DAY_MORNING",
      at: istTimeOnDay(deadline, 0, settings.reminderTime),
      enabled: settings.reminderSameDayMorn,
    },
    {
      type: "DAY_BEFORE",
      at: istTimeOnDay(deadline, -1, settings.reminderTime),
      enabled: settings.reminderDayBefore,
    },
  ];

  const accepted: typeof candidates = [];
  for (const candidate of candidates) {
    if (!candidate.enabled || candidate.at <= now || candidate.at >= deadline) continue;
    if (accepted.some((a) => Math.abs(a.at.getTime() - candidate.at.getTime()) < 30 * MINUTE)) continue;
    accepted.push(candidate);
  }

  if (accepted.length > 0) {
    await prisma.reminder.createMany({
      data: accepted.map(({ type, at }) => ({
        userId,
        opportunityId,
        scheduledAt: at,
        type,
        status: "PENDING" as const,
        message: buildReminderMessage(
          opportunity.title,
          opportunity.companyName,
          deadline,
          opportunity.registrationLink,
          type,
          hoursBefore
        ),
      })),
    });
  }

  return accepted.length;
}

/** Send a timely alert for every Recruitsage portal update, even when the
 * portal email does not state a deadline. Scheduled deadline reminders are
 * still created separately by scheduleRemindersForOpportunity. */
export async function scheduleRecruitsageAlert(
  opportunityId: string,
  userId: string
) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { email: { select: { sender: true, subject: true } } },
  });
  if (!opportunity) return false;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (!settings.remindersEnabled) return false;

  const existing = await prisma.reminder.findFirst({
    where: { opportunityId, type: "CUSTOM" },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.reminder.create({
    data: {
      userId,
      opportunityId,
      scheduledAt: new Date(),
      type: "CUSTOM",
      status: "PENDING",
      message: [
        "📣 *New Recruitsage update*",
        "",
        `📌 *${opportunity.title}*`,
        opportunity.actionRequired ? `Next step: ${opportunity.actionRequired}` : "Open PingMate to review the placement update.",
        opportunity.registrationLink ? `🔗 ${opportunity.registrationLink}` : "",
        "",
        "— PingMate",
      ].filter(Boolean).join("\n"),
    },
  });
  return true;
}

/** Re-apply the user's reminder preferences to every upcoming opportunity. */
export async function rescheduleUserReminders(userId: string) {
  const opportunities = await prisma.opportunity.findMany({
    where: { userId, status: "PENDING", deadline: { gt: new Date() } },
    select: { id: true },
  });
  for (const { id } of opportunities) {
    await scheduleRemindersForOpportunity(id, userId);
  }
}

export async function processDueReminders() {
  const now = new Date();
  const dueReminders = await prisma.reminder.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
      opportunity: {
        status: "PENDING",
      },
    },
    include: {
      user: {
        include: { settings: true },
      },
      opportunity: true,
    },
  });

  let sent = 0;
  let failed = 0;
  // Users whose WhatsApp session needs action; skip their other reminders in
  // this run instead of hitting Twilio with messages that will fail too.
  const blockedUsers = new Set<string>();

  for (const reminder of dueReminders) {
    // A reminder that is discovered only after its opportunity deadline has
    // passed should not generate an outdated WhatsApp notification.
    if (reminder.opportunity.deadline && reminder.opportunity.deadline <= now) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "CANCELLED" },
      });
      continue;
    }

    if (reminder.user.settings && !reminder.user.settings.remindersEnabled) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "CANCELLED" },
      });
      continue;
    }

    const whatsappNumber = reminder.user.settings?.whatsappNumber;
    if (!whatsappNumber || !reminder.user.settings?.whatsappVerified) {
      // Keep it PENDING so it is delivered automatically once the user verifies.
      continue;
    }

    if (blockedUsers.has(reminder.userId)) continue;

    const result = await sendWhatsAppMessage(whatsappNumber, reminder.message);

    if (result.ok) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      if (reminder.user.settings?.whatsappLastError) {
        await prisma.userSettings.update({
          where: { userId: reminder.userId },
          data: { whatsappLastError: null, whatsappLastErrorAt: null },
        });
      }
      sent++;
      continue;
    }

    failed++;
    await prisma.userSettings.update({
      where: { userId: reminder.userId },
      data: { whatsappLastError: result.error, whatsappLastErrorAt: new Date() },
    });

    if (result.recoverable) {
      // The user can fix this from their phone (e.g. re-join the sandbox);
      // retry in 15 minutes for as long as the reminder is still useful.
      blockedUsers.add(reminder.userId);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { scheduledAt: new Date(Date.now() + 15 * MINUTE) },
      });
    } else {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "FAILED" },
      });
    }
  }

  return { sent, failed, total: dueReminders.length };
}

export async function markMissedOpportunities() {
  const now = new Date();
  // Close any unsent reminders belonging to expired opportunities. They are
  // no longer useful, and keeping them pending makes delivery reporting
  // misleading.
  await prisma.reminder.updateMany({
    where: {
      status: "PENDING",
      opportunity: { deadline: { lt: now } },
    },
    data: { status: "CANCELLED" },
  });
  await prisma.opportunity.updateMany({
    where: {
      status: "PENDING",
      deadline: { lt: now },
    },
    data: { status: "MISSED" },
  });
}
