# 🏗️ PingMate Architecture

## System Overview

```
User (Browser)
    │
    ▼
Next.js App (Vercel)
    ├── Landing Page (/)
    ├── Auth Pages (/auth/*)
    └── Dashboard (/dashboard/*)
            │
            ▼
    Next.js API Routes
    ├── /api/auth/*          ← NextAuth (Google OAuth)
    ├── /api/emails          ← Gmail sync + AI analysis
    ├── /api/opportunities/* ← CRUD operations
    ├── /api/reminders/*     ← Cron-triggered sender
    ├── /api/settings        ← User preferences
    └── /api/whatsapp/verify ← OTP flow
            │
    ┌───────┴────────────────────┐
    ▼                            ▼
PostgreSQL (Supabase)        External APIs
├── Users                    ├── Gmail API (read emails)
├── Accounts (OAuth tokens)  ├── Groq (analyze emails)  
├── Emails                   └── Twilio (send WhatsApp)
├── Opportunities
├── Reminders
└── UserSettings
```

## Data Flow: Email → WhatsApp Reminder

```
1. User clicks "Scan Gmail Now"
        │
        ▼
2. /api/emails POST
   └── fetchRecentEmails(userId)
       └── Gmail API: list unread messages (last 7 days)
       └── For each message: get full email body
              │
              ▼
3. analyzeEmail(subject, body, sender)
   └── Groq (openai/gpt-oss-120b)
   └── Returns: { isOpportunity, title, category, deadline, link, priority }
              │
              ▼ (if isOpportunity === true)
4. prisma.opportunity.create(...)
   └── Store opportunity in DB
              │
              ▼ (if deadline exists)
5. scheduleRemindersForOpportunity(opportunityId, userId)
   └── Uses the user's settings (reminder time in IST, hours before)
   └── Calculate: day before, deadline day, N hours before
   └── prisma.reminder.createMany(...)
              │
              ▼ (every minute locally via node-cron; via a cron call when hosted)
6. processDueReminders()
   └── Find all PENDING reminders where scheduledAt <= now
   └── For each: sendWhatsAppMessage(phone, message)
       └── Twilio API → WhatsApp message delivered
   └── SENT on success; sandbox/session errors are retried every
       15 minutes; other errors are marked FAILED
   └── analyzePendingEmails() continues any unfinished AI analysis
```

## Key Design Decisions

### Why Next.js API Routes?
- Single codebase for frontend + backend
- Serverless → zero server management
- Works perfectly with Vercel deployment

### Why Groq?
- Free tier, OpenAI-compatible API (reuses the `openai` SDK)
- Very fast inference (~1s per email)
- JSON mode for structured extraction; emails without opportunity keywords are
  filtered locally first so a scan stays inside the per-minute rate limits

### Why both node-cron and a cron endpoint?
- Locally, `src/instrumentation-node.ts` runs the scheduler every minute
- Serverless hosts can't run background jobs, so `/api/reminders/process`
  does the same work when called by Vercel Cron or an external cron service

### Why Twilio Sandbox for WhatsApp?
- Free to set up and test
- No business verification required for MVP
- Easy upgrade to production when ready

## Security Considerations

- Gmail access is read-only (`gmail.readonly`); OAuth tokens are stored in the
  `Account` table by Auth.js, so protect database access
- Cron endpoint protected by `CRON_SECRET` bearer token
- User data strictly scoped (every DB query filters by `userId`)
- OTPs are stored only as SHA-256 hashes with a 10-minute expiry and never sent
  to the browser
- Reminders are only delivered to verified WhatsApp numbers

## Future Improvements

- [ ] Encrypt OAuth tokens at rest
- [ ] Approved WhatsApp templates for production delivery
- [ ] Email categorization improvements with few-shot prompting
- [ ] Multiple Gmail accounts per user
- [ ] Calendar integration
- [ ] Mobile app with push notifications
- [ ] Team/college-level opportunity sharing
