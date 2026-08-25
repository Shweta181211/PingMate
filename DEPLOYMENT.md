# 🚀 PingMate Deployment Guide

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
OPENAI_API_KEY
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

### Step 6 — Verify Cron

The `vercel.json` file configures the reminder cron:

```json
{
  "crons": [
    {
      "path": "/api/reminders/process",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Vercel will call this every 15 minutes with the `Authorization: Bearer CRON_SECRET` header automatically.

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
| OpenAI | ~$0.001 per email analyzed |
| Twilio | Free trial credits ($15) |

For a student MVP, total monthly cost is near $0.
