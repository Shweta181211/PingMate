import { NextRequest, NextResponse } from "next/server";
import type { UserSettings } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rescheduleUserReminders } from "@/lib/reminder-scheduler";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(settings ? toClient(settings) : {});
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const allowed = [
    "remindersEnabled",
    "reminderDayBefore",
    "reminderSameDayMorn",
    "reminderFourHours",
  ];

  const data: Record<string, boolean | string | number> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }
  if ("reminderTime" in body) {
    if (typeof body.reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.reminderTime)) {
      return NextResponse.json({ error: "Reminder time must be HH:mm" }, { status: 400 });
    }
    data.reminderTime = body.reminderTime;
  }
  if ("reminderHoursBefore" in body) {
    const hours = Number(body.reminderHoursBefore);
    if (!Number.isInteger(hours) || hours < 1 || hours > 48) {
      return NextResponse.json({ error: "Hours before must be between 1 and 48" }, { status: 400 });
    }
    data.reminderHoursBefore = hours;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  // Apply the new preferences to reminders that are already scheduled.
  if (Object.keys(data).length > 0) {
    await rescheduleUserReminders(session.user.id);
  }

  return NextResponse.json(toClient(settings));
}

// Never send the OTP hash to the browser.
function toClient(settings: UserSettings) {
  const { whatsappOtpHash, whatsappOtpExpiresAt, ...rest } = settings;
  return rest;
}
