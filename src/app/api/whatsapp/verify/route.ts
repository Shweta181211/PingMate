import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationOTP, sendWhatsAppMessage } from "@/lib/whatsapp";
import { processDueReminders } from "@/lib/reminder-scheduler";
import { createHash, randomInt } from "crypto";

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, otp } = body;

  if (action === "send") {
    // Twilio needs E.164 (+919876543210); users often type spaces or dashes.
    const phoneNumber = `+${String(body.phoneNumber || "").replace(/\D/g, "")}`;
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Enter your number with country code, e.g. +91 9876543210" },
        { status: 400 }
      );
    }

    const generatedOTP = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const sent = await sendVerificationOTP(phoneNumber, generatedOTP);

    if (!sent.ok) {
      return NextResponse.json({ error: `Failed to send OTP. ${sent.error}` }, { status: 502 });
    }

    // Store phone number (unverified)
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        whatsappNumber: phoneNumber,
        whatsappVerified: false,
        whatsappOtpHash: hashOtp(generatedOTP),
        whatsappOtpExpiresAt: expiresAt,
      },
      create: {
        userId: session.user.id,
        whatsappNumber: phoneNumber,
        whatsappVerified: false,
        whatsappOtpHash: hashOtp(generatedOTP),
        whatsappOtpExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({ success: true, message: "OTP sent via WhatsApp" });
  }

  if (action === "verify") {
    const stored = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { whatsappOtpHash: true, whatsappOtpExpiresAt: true },
    });

    if (!stored?.whatsappOtpHash || !stored.whatsappOtpExpiresAt || Date.now() > stored.whatsappOtpExpiresAt.getTime()) {
      return NextResponse.json({ error: "OTP expired. Please request a new one." }, { status: 400 });
    }

    if (stored.whatsappOtpHash !== hashOtp(String(otp || ""))) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await prisma.userSettings.update({
      where: { userId: session.user.id },
      data: { whatsappVerified: true, whatsappOtpHash: null, whatsappOtpExpiresAt: null },
    });

    // If any reminder became due while verification was in progress, deliver
    // it right away instead of waiting for the next production cron tick.
    await processDueReminders();

    return NextResponse.json({ success: true, message: "WhatsApp number verified!" });
  }

  if (action === "test") {
    const settings = await prisma.userSettings.findUnique({ where: { userId: session.user.id } });
    if (!settings?.whatsappNumber || !settings.whatsappVerified) {
      return NextResponse.json({ error: "Verify your WhatsApp number first." }, { status: 400 });
    }
    const result = await sendWhatsAppMessage(
      settings.whatsappNumber,
      "✅ *PingMate test message*\n\nWhatsApp reminders are working. You'll get your deadline reminders here.\n\n— PingMate 🤖"
    );
    await prisma.userSettings.update({
      where: { userId: session.user.id },
      data: result.ok
        ? { whatsappLastError: null, whatsappLastErrorAt: null }
        : { whatsappLastError: result.error, whatsappLastErrorAt: new Date() },
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

    // The session is open again, so deliver anything that was waiting.
    await processDueReminders();
    return NextResponse.json({ success: true, message: "Test message delivered on WhatsApp." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
