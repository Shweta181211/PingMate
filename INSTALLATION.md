# 📦 PingMate Installation Guide

> Complete step-by-step guide for beginners. Follow every step in order.

---

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- VS Code ([download](https://code.visualstudio.com))
- A Google account
- A WhatsApp number

---

## Step 1 — Clone the Project

```bash
git clone https://github.com/Shweta181211/PingMate.git
cd PingMate
npm install
cp .env.example .env
```

Open `.env` in VS Code. You'll fill this in as you complete the steps below.

---

## Step 2 — Create Supabase Database

1. Go to https://supabase.com → Sign Up
2. Click "New Project"
3. Choose a name (e.g. `pingmate-db`), strong password, and region (Mumbai for India)
4. Wait 2 minutes for it to spin up
5. Open **Connect → ORM → Prisma**
6. Copy the **Session pooler** connection string (port `5432`)
7. Paste into `.env`:
   ```
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@[YOUR-REGION].pooler.supabase.com:5432/postgres?sslmode=require"
   ```

   Use the string Supabase gives you exactly. Do not use an older saved URL;
   a reset database password invalidates all previous URLs.

---

## Step 3 — Set Up Google OAuth + Gmail API

### Create OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create a new project (name it "PingMate")
3. Go to **APIs & Services → OAuth consent screen**
   - User Type: External
   - App name: PingMate
   - Add your email
   - Save and Continue (skip scopes for now)
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** and **Client Secret** → paste into `.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

### Enable Gmail API

1. Go to **APIs & Services → Library**
2. Search "Gmail API" → Enable it

### Add Gmail Scope

1. Go to **OAuth consent screen → Edit → Scopes**
2. Add scope: `https://www.googleapis.com/auth/gmail.readonly`
3. Add your own email as a test user (under "Test users")

---

## Step 4 — Generate NEXTAUTH_SECRET

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output → paste into `.env`:
```
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Step 5 — Get a Groq API Key

1. Go to https://console.groq.com → Sign up (free tier available)
2. Go to **API Keys → Create API Key**
3. Copy the key → paste into `.env`:
   ```
   GROQ_API_KEY="gsk_..."
   ```
4. Optional: set `GROQ_MODEL` to use a different model (default `openai/gpt-oss-120b`)

---

## Step 6 — Set Up Twilio WhatsApp

1. Go to https://twilio.com → Sign up (free trial)
2. Go to **Messaging → Try it Out → Send a WhatsApp message**
3. Follow the sandbox setup:
   - You'll get a number like `+14155238886`
   - Send `join [sandbox-word]` to that number from your WhatsApp
4. Go to **Account → API keys** → copy:
   ```
   TWILIO_ACCOUNT_SID="ACxxxxxxxx"
   TWILIO_AUTH_TOKEN="your-auth-token"
   TWILIO_WHATSAPP_NUMBER="+14155238886"
   NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER="+14155238886"
   ```

---

## Step 7 — Set Cron Secret

Generate a random string for cron security:

```bash
openssl rand -hex 20
```

Add to `.env`:
```
CRON_SECRET="your-random-cron-secret"
```

---

## Step 8 — Push Database Schema

```bash
npx prisma generate
npx prisma db push
```

You should see: "Your database is now in sync with your Prisma schema."

---

## Step 9 — Run Locally

```bash
npm run dev
```

Open http://localhost:3000

1. Click "Connect Gmail" → Sign in with Google
2. Go to Settings → verify your WhatsApp number
3. Go to Dashboard → click "Scan Gmail Now"
4. Watch opportunities appear!

---

## Step 10 — Test WhatsApp Reminders

To manually trigger the reminder processor:

```bash
curl -X POST http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Gmail not connecting | Make sure you added yourself as a test user in Google Cloud Console |
| "PingMate doesn't have permission to read Gmail" | Click **Grant Gmail access** and tick **View your email messages** on Google's consent screen (it is unticked by default) |
| WhatsApp reminders stop arriving | The Twilio sandbox only delivers within 24 hours of your last message to it. Send any message (or your `join <word>` phrase) to the sandbox number, then use **Settings → Send test message**. Waiting reminders retry every 15 minutes |
| WhatsApp OTP not received | Make sure you joined the Twilio sandbox (send "join [word]" to the number) |
| Prisma errors / `tenant/user not found` | Copy a new **Connect → ORM → Prisma → Session pooler** URL from Supabase and replace `DATABASE_URL` in `.env` |
| Build errors | Run `npm install` then `npm run dev` again |

---

For deployment, see `DEPLOYMENT.md`.
