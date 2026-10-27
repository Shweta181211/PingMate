# 📡 PingMate API Reference

Base URL: `http://localhost:3000` (development) or `https://your-app.vercel.app` (production)

All routes (except auth) require an active session cookie.

---

## Authentication

### `GET /api/auth/signin`
Redirects to Google OAuth flow.

### `GET /api/auth/callback/google`
OAuth callback — handled automatically by NextAuth.

---

## Emails

### `POST /api/emails`
Fetch recent Gmail messages, store new ones, and analyse pending emails with AI
(within a time budget; the rest are analysed in the background).

**Response:**
```json
{
  "scanned": 100,
  "newEmails": 12,
  "processed": 8,
  "opportunitiesFound": 3,
  "recruitsageUpdates": 0,
  "pendingAnalysis": 4,
  "rateLimited": false,
  "remindersSent": 0,
  "remindersFailed": 0
}
```

**Errors:** `401` with `code` set to `GMAIL_PERMISSION_MISSING` (Gmail checkbox not
granted) or `GMAIL_RECONNECT_REQUIRED` (token expired); `503` with
`GMAIL_API_DISABLED` when the Gmail API is not enabled in Google Cloud.

### `POST /api/gmail/reconnect`
Removes the stored Google tokens so the next Google sign-in grants fresh access.

### `GET /api/emails`
Get recent analyzed emails.

**Response:** Array of email objects with linked opportunity if found.

---

## Opportunities

### `GET /api/opportunities`
Get all opportunities with optional filters.

**Query params:**
- `category` — `INTERNSHIP | PLACEMENT | HACKATHON | ...`
- `status` — `PENDING | APPLIED | IGNORED | MISSED`
- `search` — Full-text search by title or company

**Response:** Array of opportunity objects with reminders.

### `PATCH /api/opportunities/:id`
Update opportunity status.

**Body:**
```json
{ "status": "APPLIED" }
```

Valid statuses: `PENDING | APPLIED | IGNORED | MISSED`. Cancels pending reminders
when status is `APPLIED` or `IGNORED`; restoring to `PENDING` reschedules them.

### `DELETE /api/opportunities/:id`
Delete an opportunity and its reminders.

---

## WhatsApp Verification

### `POST /api/whatsapp/verify`

**Send OTP:**
```json
{ "action": "send", "phoneNumber": "+919876543210" }
```

**Verify OTP:**
```json
{ "action": "verify", "otp": "123456" }
```

**Send a test message** (verified numbers only):
```json
{ "action": "test" }
```

---

## Settings

### `GET /api/settings`
Get user settings.

### `PATCH /api/settings`
Update settings. Upcoming reminders are rescheduled with the new preferences.

**Body (any combination):**
```json
{
  "remindersEnabled": true,
  "reminderDayBefore": true,
  "reminderSameDayMorn": false,
  "reminderFourHours": true,
  "reminderTime": "09:00",
  "reminderHoursBefore": 4
}
```

- `reminderTime` — `HH:mm`, India time; used for the day-before and same-day reminders
- `reminderHoursBefore` — `1`–`48`; hours before the deadline for the last-chance reminder

---

## Dashboard

### `GET /api/dashboard/stats`
Get dashboard summary.

**Response:**
```json
{
  "stats": {
    "total": 15,
    "upcoming": 4,
    "applied": 6,
    "missed": 2
  },
  "todayDeadlines": [...],
  "thisWeek": [...],
  "upcomingReminders": [...],
  "pendingAnalysis": 0,
  "settings": { ... }
}
```

---

## Reminders (Cron)

### `GET /api/reminders/process`
Send due reminders, mark expired opportunities as missed, and analyse a batch of
pending emails.

**Auth:** `Authorization: Bearer CRON_SECRET`

Call it every 5–15 minutes from a cron service when hosted. Locally, the dev
server runs the same work every minute.

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "total": 2,
  "analysis": { "analyzed": 5, "opportunitiesFound": 1, "remaining": 0 }
}
```
