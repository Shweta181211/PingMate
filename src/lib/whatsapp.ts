import twilio from "twilio";

export const REMINDER_TIMEZONE = "Asia/Kolkata";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!sid || !token || !from) return null;
  return { client: twilio(sid, token), from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}` };
}

export type WhatsAppSendResult = { ok: true } | { ok: false; code?: number; error: string; recoverable: boolean };

// Twilio errors the user can fix from their phone (sandbox not joined, or no
// message from them in the last 24h). Reminders hitting these are retried.
const RECOVERABLE_CODES = new Set([63015, 63016, 63024, 63112, 21608]);

function describeTwilioError(code: number | undefined, message: string) {
  const join = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE || "join <your-sandbox-word>";
  const sandbox = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || "the Twilio sandbox number";
  if (code === 63015 || code === 21608 || code === 63112) {
    return `Your number is not connected to the Twilio WhatsApp sandbox. Send "${join}" to ${sandbox} on WhatsApp.`;
  }
  if (code === 63016 || code === 63024) {
    return `WhatsApp only allows PingMate to message you within 24 hours of your last message. Send "${join}" (or any message) to ${sandbox} on WhatsApp.`;
  }
  return message;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<WhatsAppSendResult> {
  const config = getClient();
  if (!config) {
    console.warn("[whatsapp] Twilio is not configured; message was not sent.");
    return { ok: false, error: "WhatsApp is not configured on the server (missing Twilio credentials).", recoverable: false };
  }
  try {
    const normalizedTo = to.startsWith("+") ? to : `+${to}`;
    const sent = await config.client.messages.create({
      from: config.from,
      to: `whatsapp:${normalizedTo}`,
      body: message,
    });
    // Sandbox/session failures are often reported asynchronously; check the
    // status Twilio settles on so a failed delivery is not counted as sent.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const latest = await config.client.messages(sent.sid).fetch();
    if (latest.status === "failed" || latest.status === "undelivered") {
      const code = latest.errorCode ?? undefined;
      console.error(`[whatsapp] delivery ${latest.status} (Twilio code ${code ?? "n/a"})`);
      return {
        ok: false,
        code,
        error: describeTwilioError(code, latest.errorMessage || `Message ${latest.status}`),
        recoverable: code !== undefined && RECOVERABLE_CODES.has(code),
      };
    }
    return { ok: true };
  } catch (error) {
    const e = error as { code?: number; message?: string };
    console.error(`[whatsapp] send failed (Twilio code ${e?.code ?? "n/a"}): ${e?.message ?? error}`);
    return {
      ok: false,
      code: e?.code,
      error: describeTwilioError(e?.code, e?.message || String(error)),
      recoverable: e?.code !== undefined && RECOVERABLE_CODES.has(e.code),
    };
  }
}

export function formatDeadlineIst(deadline: Date) {
  return deadline.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: REMINDER_TIMEZONE,
  });
}

export function buildReminderMessage(
  title: string,
  company: string | null | undefined,
  deadline: Date,
  link: string | null | undefined,
  type: "DAY_BEFORE" | "SAME_DAY_MORNING" | "FOUR_HOURS_BEFORE" | "CUSTOM",
  hoursBefore = 4
): string {
  const urgencyMessages: Record<string, string> = {
    DAY_BEFORE: "⏰ *Deadline Tomorrow!*",
    SAME_DAY_MORNING: "🌅 *Deadline Today!*",
    FOUR_HOURS_BEFORE: `🚨 *Only ${hoursBefore} Hour${hoursBefore === 1 ? "" : "s"} Left!*`,
    CUSTOM: "🔔 *Reminder*",
  };

  const lines = [
    urgencyMessages[type] || "🔔 *PingMate Reminder*",
    "",
    `📌 *${title}*`,
    company ? `🏢 ${company}` : "",
    "",
    `⏳ Deadline: ${formatDeadlineIst(deadline)}`,
  ];

  if (link) {
    lines.push("", `🔗 Apply here: ${link}`);
  }

  lines.push("", "— PingMate 🤖");

  return lines.join("\n");
}

export async function sendVerificationOTP(phoneNumber: string, otp: string) {
  const message = `🔐 Your PingMate verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n— PingMate Team`;
  return sendWhatsAppMessage(phoneNumber, message);
}
