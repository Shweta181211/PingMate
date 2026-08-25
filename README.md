# 🏓 PingMate — Your Inbox Reminder Buddy

> **Never miss an opportunity again.** PingMate scans your Gmail, extracts deadlines using AI, and sends WhatsApp reminders automatically.

![PingMate](https://img.shields.io/badge/PingMate-MVP-4F46E5?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Google OAuth | Sign in with Google, Gmail access granted in one click |
| 🧠 AI Analysis | GPT-4o-mini reads emails and extracts deadlines + metadata |
| 💬 WhatsApp Alerts | Automatic reminders at 1 day, morning, and 4 hours before |
| 📊 Dashboard | Track all opportunities with status management |
| 🔍 Smart Search | Filter by category, status, company |
| ⚙️ Settings | Full control over reminder timing and WhatsApp number |

---

## 🚀 Quick Start

```bash
git clone https://github.com/yourusername/pingmate
cd pingmate
npm install
cp .env.example .env.local
# Fill in your .env.local values
npx prisma db push
npm run dev
```

Open http://localhost:3000

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Auth**: NextAuth v5 with Google OAuth
- **AI**: OpenAI GPT-4o-mini
- **WhatsApp**: Twilio WhatsApp API
- **Deploy**: Vercel + Supabase

---

## 📁 Project Structure

```
pingmate/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth handler
│   │   │   ├── emails/        # Gmail sync + AI analysis
│   │   │   ├── opportunities/ # CRUD for opportunities
│   │   │   ├── reminders/     # Cron-triggered reminder sender
│   │   │   ├── settings/      # User preferences
│   │   │   └── whatsapp/      # OTP verification
│   │   ├── auth/signin/       # Sign-in page
│   │   ├── dashboard/         # Main dashboard
│   │   │   ├── opportunities/ # All opportunities view
│   │   │   └── settings/      # Settings page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles
│   └── lib/
│       ├── auth.ts            # NextAuth config
│       ├── gmail.ts           # Gmail API integration
│       ├── openai.ts          # AI email analysis
│       ├── prisma.ts          # Prisma client
│       ├── reminder-scheduler.ts  # Reminder logic
│       ├── utils.ts           # Utility functions
│       └── whatsapp.ts        # Twilio WhatsApp
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                # Cron configuration
```

---

## 🔐 Environment Variables

See `.env.example` for all required variables. See `INSTALLATION.md` for detailed setup guide.

---

## 📱 How Reminders Work

1. User syncs Gmail → emails fetched via Gmail API
2. Each email analyzed by GPT-4o-mini → structured JSON extracted
3. If opportunity detected with deadline → 3 reminders scheduled
4. Vercel Cron runs every 15 min → sends due WhatsApp messages via Twilio
5. If user marks "Applied" → pending reminders cancelled

---

## 🌐 Deployment

Deploy to Vercel in one command:

```bash
vercel --prod
```

Add all environment variables in Vercel Dashboard → Settings → Environment Variables.

Vercel Cron (in `vercel.json`) fires every 15 minutes to process pending reminders.

---

## 🎓 Built For

College students who receive important emails about internships, hackathons, scholarships, and competitions but miss deadlines due to inbox overload.

---

*Made with ❤️ for the hackathon*
