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
├── Accounts (OAuth tokens)  ├── OpenAI (analyze emails)
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
   └── OpenAI GPT-4o-mini
   └── Returns: { isOpportunity, title, category, deadline, link, priority }
              │
              ▼ (if isOpportunity === true)
4. prisma.opportunity.create(...)
   └── Store opportunity in DB
              │
              ▼ (if deadline exists)
5. scheduleRemindersForOpportunity(opportunityId, userId)
   └── Calculate: dayBefore, sameDayMorning, fourHoursBefore
   └── prisma.reminder.createMany(...)
              │
              ▼ (every 15 minutes, via Vercel Cron)
6. /api/reminders/process
   └── processDueReminders()
       └── Find all PENDING reminders where scheduledAt <= now
       └── For each: sendWhatsAppMessage(phone, message)
           └── Twilio API → WhatsApp message delivered
       └── Update reminder status: SENT or FAILED
```

## Key Design Decisions

### Why Next.js API Routes?
- Single codebase for frontend + backend
- Serverless → zero server management
- Works perfectly with Vercel deployment

### Why GPT-4o-mini?
- Cheapest OpenAI model ($0.15/1M tokens)
- Fast enough for real-time analysis
- Good at structured JSON extraction

### Why Vercel Cron instead of node-cron?
- Serverless functions can't run background jobs
- Vercel Cron calls the API endpoint every 15 minutes
- Free on Vercel hobby plan

### Why Twilio Sandbox for WhatsApp?
- Free to set up and test
- No business verification required for MVP
- Easy upgrade to production when ready

## Security Considerations

- Gmail tokens stored encrypted in DB (handled by NextAuth)
- Cron endpoint protected by `CRON_SECRET` bearer token
- User data strictly scoped (every DB query filters by `userId`)
- OTPs stored in memory with 10-minute expiry
- Phone numbers stored only after verification

## Future Improvements

- [ ] Redis for OTP storage (instead of in-memory Map)
- [ ] Email categorization improvements with few-shot prompting
- [ ] Multiple Gmail accounts per user
- [ ] Calendar integration
- [ ] Mobile app with push notifications
- [ ] Team/college-level opportunity sharing
