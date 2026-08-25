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
Scan Gmail and analyze new emails with AI.

**Response:**
```json
{
  "processed": 12,
  "opportunitiesFound": 3
}
```

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

Cancels pending reminders when status is `APPLIED` or `IGNORED`.

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

---

## Settings

### `GET /api/settings`
Get user settings.

### `PATCH /api/settings`
Update settings.

**Body (any combination):**
```json
{
  "remindersEnabled": true,
  "reminderDayBefore": true,
  "reminderSameDayMorn": false,
  "reminderFourHours": true
}
```

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
  "settings": { ... }
}
```

---

## Reminders (Cron)

### `GET /api/reminders/process`
Process and send due reminders.

**Auth:** `Authorization: Bearer CRON_SECRET`

Called automatically by Vercel Cron every 15 minutes.

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "total": 2
}
```
