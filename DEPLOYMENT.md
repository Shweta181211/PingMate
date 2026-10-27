# 🚀 PingMate Deployment Guide

## Before you deploy

1. In Supabase, open **Connect → ORM → Prisma**, copy the *current* connection string, and use it for `DATABASE_URL`. Do not reuse an old pooler password or host.
2. Apply the current schema with `npx prisma db push`. If the pooler prevents it, run the safe migration at `prisma/migrations/20261008_persist_whatsapp_otp/migration.sql` in Supabase SQL Editor.
3. Add `https://YOUR-VERCEL-DOMAIN/api/auth/callback/google` in Google Cloud OAuth Authorized redirect URIs.
4. Set `NEXTAUTH_URL=https://YOUR-VERCEL-DOMAIN` plus a new production `NEXTAUTH_SECRET` in Vercel.
5. For college portal notices, optionally set `RECRUITSAGE_SENDER_DOMAINS` to a comma-separated list of sender domains if your Recruitsage notifications do not visibly contain “Recruitsage”.

## Deploy to Vercel (Free Tier)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial PingMate MVP"
gh repo create pingmate --public --push
# OR manually push to GitHub
```

### Step 2 — Connect to Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **New Project** → Import your `pingmate` repo
3. Framework: Next.js (auto-detected)
4. Click **Deploy** (it will fail — that's OK, we need env vars)

### Step 3 — Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

```
DATABASE_URL
NEXTAUTH_URL        ← set to your Vercel URL: https://pingmate-xyz.vercel.app
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GROQ_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
CRON_SECRET
NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER
```

### Step 4 — Update Google OAuth

1. Go to Google Cloud Console → Your Project → Credentials
2. Edit your OAuth 2.0 Client
3. Add to Authorized redirect URIs:
   `https://your-vercel-url.vercel.app/api/auth/callback/google`

### Step 5 — Redeploy

In Vercel, click **Redeploy** → it should succeed now.

### Step 6 — Set Up the Reminder Cron

`vercel.json` registers a **daily** Vercel Cron (`0 3 * * *`, 08:30 IST), which is
the most frequent schedule the Vercel Hobby plan allows. Vercel sends the
`Authorization: Bearer CRON_SECRET` header automatically.

Daily is not enough for "1 day before" and "4 hours before" reminders. For timely
delivery, either:

- **Vercel Pro:** change the schedule in `vercel.json` to `*/15 * * * *`, or
- **Free external cron** (e.g. cron-job.org): call
  `GET https://YOUR-VERCEL-DOMAIN/api/reminders/process` every 5–15 minutes with the
  header `Authorization: Bearer <CRON_SECRET>`.

Check **Vercel Dashboard → Logs → Cron** to verify it's running.

---

## Database (Supabase)

Your Supabase database on the free tier supports:
- 500MB storage
- 2 projects
- Unlimited API calls

No extra setup needed — Vercel connects directly via `DATABASE_URL`.

---

## Monitoring

- **Vercel**: Dashboard → Functions → view logs
- **Supabase**: Dashboard → Database → Table editor (view records)
- **Twilio**: Dashboard → Monitor → Logs (view WhatsApp messages sent)

---

## Costs (Rough Estimate)

| Service | Free Tier |
|---|---|
| Vercel | Free (hobby plan) |
| Supabase | Free (500MB) |
| Groq | Free tier (rate-limited) |
| Twilio | Free trial credits ($15) |

For a student MVP, total monthly cost is near $0.
