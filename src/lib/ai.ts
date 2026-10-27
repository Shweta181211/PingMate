import OpenAI from "openai";
import { z } from "zod";
import { isRecruitsageEmail } from "./recruitsage";

// Groq exposes an OpenAI-compatible API, so the OpenAI SDK is reused with
// Groq's base URL. Created lazily: the constructor throws when the key is
// missing, which would break the build and the local fallback below.
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

let groqClient: OpenAI | null = null;
function getGroq() {
  groqClient ??= new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
    maxRetries: 1,
    timeout: 30_000,
  });
  return groqClient;
}

const CATEGORIES = [
  "INTERNSHIP",
  "PLACEMENT",
  "INTERVIEW",
  "HACKATHON",
  "COMPETITION",
  "SCHOLARSHIP",
  "EVENT",
  "OTHER",
] as const;

// Models are not perfectly consistent with casing or nulls, so normalise
// instead of rejecting an otherwise good answer.
const upper = (value: unknown) => (typeof value === "string" ? value.trim().toUpperCase() : value);
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || undefined);

const OpportunitySchema = z.object({
  isOpportunity: z.boolean(),
  title: optionalText,
  companyName: optionalText,
  category: z.preprocess(upper, z.enum(CATEGORIES)).catch("OTHER"),
  deadline: z.string().nullish(),
  registrationLink: z.string().nullish(),
  actionRequired: optionalText,
  priority: z.preprocess(upper, z.enum(["LOW", "MEDIUM", "HIGH"])).catch("MEDIUM"),
  reasoning: optionalText,
});

export type AnalyzedOpportunity = Partial<z.infer<typeof OpportunitySchema>> & {
  isOpportunity: boolean;
  /** ai = classified by Groq, filter = skipped by the keyword filter,
   *  fallback = keyword guess (no key or AI error), worth re-analysing later. */
  source?: "ai" | "filter" | "fallback";
};

/** Thrown when Groq's rate limit is hit, so callers can pause and resume
 * the remaining emails later instead of storing low-quality guesses. */
export class AiRateLimitedError extends Error {}

const RELEVANT =
  /\b(internship|intern|placement|interview|hackathon|scholarship|fellowship|competition|contest|workshop|career fair|hiring|recruit(ment|ing)?|job|apply|application|register|registration|shortlist(ed)?|assessment|webinar|conference)\b/i;

function fallbackAnalysis(subject: string, body: string, sender = "", senderEmail = ""): AnalyzedOpportunity {
  const content = `${subject}\n${body}`;
  const isRecruitsage = isRecruitsageEmail({ sender, senderEmail, subject, body });
  if (!RELEVANT.test(content) && !isRecruitsage) return { isOpportunity: false, source: "filter" };
  const url = content.match(/https?:\/\/[^\s<>"')\]]+/i)?.[0] ?? null;
  const category = /interview/i.test(content) ? "INTERVIEW" : /internship/i.test(content) ? "INTERNSHIP" : /placement|hiring|job/i.test(content) ? "PLACEMENT" : /hackathon/i.test(content) ? "HACKATHON" : /scholarship|fellowship/i.test(content) ? "SCHOLARSHIP" : /competition|contest/i.test(content) ? "COMPETITION" : /workshop|event|fair/i.test(content) ? "EVENT" : "OTHER";
  return {
    source: "fallback",
    isOpportunity: true,
    title: subject.trim() || "Opportunity from Gmail",
    companyName: isRecruitsage ? "Recruitsage" : undefined,
    category: isRecruitsage ? "PLACEMENT" : category,
    deadline: null,
    registrationLink: url,
    actionRequired: "Review the source email and complete the application.",
    priority: isRecruitsage ? "HIGH" : "MEDIUM",
    reasoning: isRecruitsage
      ? "Recognized as a Recruitsage college placement portal update."
      : "Local keyword fallback used because AI analysis was unavailable.",
  };
}

// Models are unreliable at weekday arithmetic ("this Friday"), so give them a
// ready-made calendar in IST starting from the day the email arrived.
function upcomingCalendar(from: Date) {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return Array.from({ length: 14 }, (_, i) =>
    `- ${i === 0 ? "Today: " : i === 1 ? "Tomorrow: " : ""}${fmt.format(new Date(from.getTime() + i * 86_400_000))}`
  ).join("\n");
}

export async function analyzeEmail(
  subject: string,
  body: string,
  sender: string,
  senderEmail = "",
  receivedAt: Date = new Date()
): Promise<AnalyzedOpportunity> {
  const isRecruitsage = isRecruitsageEmail({ sender, senderEmail, subject, body });

  // OTPs, receipts, newsletters etc. never mention these words. Skipping them
  // locally keeps a 100-email scan inside Groq's per-minute rate limits.
  if (!isRecruitsage && !RELEVANT.test(`${subject}\n${body}`)) {
    return { isOpportunity: false, source: "filter" };
  }

  if (!process.env.GROQ_API_KEY) {
    console.warn("[email-analysis] GROQ_API_KEY is not configured; using conservative local classification.");
    return fallbackAnalysis(subject, body, sender, senderEmail);
  }

  const prompt = `
You are an AI assistant for students in India.

Your job is to analyze emails and determine whether they contain important opportunities.

Email received at: ${receivedAt.toISOString()}

Calendar from the day the email was received (India time). Use it to resolve
relative dates such as "tomorrow" or "this Friday":
${upcomingCalendar(receivedAt)}

Email Subject:
${subject}

From:
${sender}

Sender email:
${senderEmail}

Email Body:
${body.substring(0, 2500)}

Return ONLY valid JSON in the following format:

{
  "isOpportunity": true,
  "title": "",
  "companyName": "",
  "category": "INTERNSHIP",
  "deadline": null,
  "registrationLink": null,
  "actionRequired": "",
  "priority": "MEDIUM"
}

Rules:

1. Return isOpportunity = false ONLY for:
- OTPs
- Bank transactions
- Payment receipts
- Password reset emails
- Delivery updates
- Bills / invoices
- Pure advertisements

2. Return isOpportunity = true for:
- Internships
- Placements
- Jobs
- Hiring
- Campus recruitment
- Hackathons
- Competitions
- Scholarships
- Fellowships
- Conferences
- Workshops
- Career fairs
- Coding contests
- Recruitment drives

3. Emails from these senders are usually opportunities:
- Internshala
- Unstop
- LinkedIn Jobs
- Glassdoor
- Wellfound
- Naukri
- Indeed
- GeeksforGeeks
- HackerRank
- CodeChef
- SmartRecruiters
- Greenhouse
- Lever
- Company career portals
- Recruitsage, including any college-branded Recruitsage notification address

3a. IMPORTANT: If the sender, subject, or body identifies Recruitsage, this
is a college placement portal update. Always return isOpportunity = true,
category = PLACEMENT, companyName = Recruitsage, and priority = HIGH, even if
the update is an eligibility, registration, interview, test, shortlist, or
result notification and has no explicit deadline.

4. If unsure, prefer isOpportunity = true.

5. Extract deadline if present, as a full ISO 8601 datetime with a timezone
offset (e.g. 2026-10-30T23:59:00+05:30). Assume Indian Standard Time (+05:30)
when the email does not state a timezone, and 23:59 when it gives only a date.

Look for phrases like:
- apply before
- applications close
- closes on
- last date
- deadline
- due by
- register before
- today
- tomorrow
- within 48 hours

If there is no application deadline but the email gives the date of a test,
interview, or event the student must attend, use that date as the deadline.

6. If no deadline or date exists, return null.

7. Extract registration/apply URL whenever possible.

8. category must be exactly one of: ${CATEGORIES.join(", ")}.

9. Priority:
HIGH → deadline within 7 days OR top company.
MEDIUM → normal opportunity.
LOW → informational opportunity.
`;

  try {
    const response = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      // gpt-oss models spend part of this budget on reasoning tokens; low
      // effort keeps each email well inside Groq's tokens-per-minute limit.
      reasoning_effort: "low",
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";

    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const analysis: AnalyzedOpportunity = { ...OpportunitySchema.parse(JSON.parse(cleaned)), source: "ai" };
      if (isRecruitsage) {
        // Recruitsage notices are always actionable placement updates.
        return {
          ...analysis,
          isOpportunity: true,
          title: analysis.title || subject.trim() || "Recruitsage update",
          companyName: analysis.companyName || "Recruitsage",
          category: "PLACEMENT",
          priority: "HIGH",
        };
      }
      return analysis;
    } catch {
      console.warn("[email-analysis] AI returned invalid JSON; using local fallback.");
      return fallbackAnalysis(subject, body, sender, senderEmail);
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status === 429) {
      throw new AiRateLimitedError(error.message);
    }
    console.error("[email-analysis] Groq request failed; using local fallback.", error instanceof Error ? error.message : error);
    return fallbackAnalysis(subject, body, sender, senderEmail);
  }
}
