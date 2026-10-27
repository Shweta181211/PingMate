import { google } from "googleapis";
import { prisma } from "./prisma";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/** Google lets users untick "View your email messages" on the consent
 * screen; sign-in still succeeds but without Gmail access. */
export function hasGmailScope(scope: string | null | undefined) {
  return Boolean(scope?.split(/\s+/).includes(GMAIL_SCOPE));
}

export type GmailErrorCode = "GMAIL_RECONNECT_REQUIRED" | "GMAIL_PERMISSION_MISSING" | "GMAIL_API_DISABLED";

export class GmailAccessError extends Error {
  constructor(public code: GmailErrorCode, message: string) {
    super(message);
  }
}

/** Translate Google API / OAuth failures into actionable error codes. */
export function toGmailAccessError(error: unknown): GmailAccessError | null {
  if (error instanceof GmailAccessError) return error;
  const e = error as { message?: string; response?: { data?: any } };
  const message = e?.message || "";
  const data = e?.response?.data;
  const details = JSON.stringify(data ?? "");
  if (message.includes("invalid_grant") || data?.error === "invalid_grant") {
    return new GmailAccessError("GMAIL_RECONNECT_REQUIRED", "Your Gmail access has expired. Reconnect Gmail to continue scanning.");
  }
  if (details.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || message.includes("insufficient authentication scopes")) {
    return new GmailAccessError(
      "GMAIL_PERMISSION_MISSING",
      "PingMate doesn't have permission to read Gmail. Click “Grant Gmail access” and tick the “View your email messages” checkbox on Google's screen."
    );
  }
  if (details.includes("SERVICE_DISABLED") || details.includes("accessNotConfigured") || message.includes("has not been used in project")) {
    return new GmailAccessError(
      "GMAIL_API_DISABLED",
      "The Gmail API is not enabled for this Google Cloud project. Enable it at console.cloud.google.com → APIs & Services → Library → Gmail API, then scan again."
    );
  }
  return null;
}

export async function getGmailClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account || (!account.access_token && !account.refresh_token)) {
    throw new GmailAccessError("GMAIL_RECONNECT_REQUIRED", "Gmail is not connected. Reconnect Gmail to continue scanning.");
  }
  if (!hasGmailScope(account.scope)) {
    throw toGmailAccessError(new Error("insufficient authentication scopes"))!;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh token if expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : undefined,
        },
      }).catch((error) => console.error("[gmail] failed to persist refreshed token", error));
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function fetchRecentEmails(userId: string, maxResults = 100) {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    // Placement drives can open months before their deadline. Recruitsage
    // notices are still de-duplicated in the database, so this remains safe.
    q: "newer_than:180d",
  });

  const messageIds = (response.data.messages || [])
    .map((msg) => msg.id)
    .filter((id): id is string => Boolean(id));
  const emails = [];

  // Fetch in small parallel batches: sequential requests are too slow for
  // serverless timeouts, unbounded ones trip Gmail rate limits.
  const BATCH_SIZE = 10;
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = await Promise.all(
      messageIds.slice(i, i + BATCH_SIZE).map(async (id) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "full",
        });

        const headers = detail.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const dateStr = headers.find((h) => h.name === "Date")?.value;

        const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/) || [null, from, from];
        const senderName = fromMatch[1]?.replace(/^"|"$/g, "").trim() || from;
        const senderEmail = fromMatch[2]?.trim() || from;

        const body = extractBody(detail.data.payload);
        const snippet = detail.data.snippet || "";

        return {
          gmailId: id,
          subject,
          sender: senderName,
          senderEmail,
          snippet,
          body: body.substring(0, 10000),
          receivedAt: dateStr && !Number.isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date(),
        };
      })
    );
    emails.push(...batch);
  }

  return emails;
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64url").toString("utf-8");
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}
