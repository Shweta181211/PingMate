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
git clone https://github.com/yourusername/pingmate
cd pingmate
npm install
cp .env.example .env.local
```

Open `.env.local` in VS Code. You'll fill this in as you complete the steps below.

---

## Step 2 — Create Supabase Database

1. Go to https://supabase.com → Sign Up
2. Click "New Project"
3. Choose a name (e.g. `pingmate-db`), strong password, and region (Mumbai for India)
4. Wait 2 minutes for it to spin up
5. Go to **Settings → Database**
6. Copy the **Connection String (URI)** under "Connection pooling"
7. Paste into `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[ref].supabase.co:5432/postgres?pgbouncer=true"
   ```

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
5. Copy **Client ID** and **Client Secret** → paste into `.env.local`:
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

Copy the output → paste into `.env.local`:
```
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Step 5 — Get OpenAI API Key

1. Go to https://platform.openai.com → Sign up
2. Go to **API Keys → Create new secret key**
3. Copy the key → paste into `.env.local`:
   ```
   OPENAI_API_KEY="sk-proj-..."
   ```
4. Add at least $5 of credits (GPT-4o-mini costs ~$0.001 per email analyzed)

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

Add to `.env.local`:
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

1. Click "Get Started" → Sign in with Google
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
| WhatsApp OTP not received | Make sure you joined the Twilio sandbox (send "join [word]" to the number) |
| Prisma errors | Run `npx prisma db push` again |
| Build errors | Run `npm install` then `npm run dev` again |

---

For deployment, see `DEPLOYMENT.md`.
