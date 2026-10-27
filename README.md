# 🏓 PingMate — Your Inbox Reminder Buddy

> **Never miss an opportunity again.** PingMate reads your Gmail, uses AI to pick out internships, placements, hackathons and other opportunities along with their deadlines, and reminds you on WhatsApp before it's too late.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Google sign-in** | Sign in with Google and grant read-only Gmail access |
| 🧠 **AI email analysis** | A Groq-hosted LLM extracts the title, company, category, deadline and apply link from each email |
| 💬 **WhatsApp reminders** | Reminders the day before and on the deadline day at a time you choose, plus a last-chance reminder N hours before |
| 🎓 **Recruitsage alerts** | College placement-portal (Recruitsage) updates are detected and sent to WhatsApp right away |
| 📊 **Dashboard** | Today's and this week's deadlines, upcoming WhatsApp reminders, and stats |
| 🔍 **Search & filters** | Filter opportunities by category, status, company or title |
| ⚙️ **Settings** | Reminder time, hours-before, on/off toggles, WhatsApp verification and a test message |

---

## 🧭 How It Works

```
Gmail ──► fetch recent emails ──► keyword pre-filter ──► Groq LLM ──► Opportunity + deadline
                                                                          │
                                         reminder schedule (your settings, India time)
                                                                          │
                              scheduler (every minute) ──► Twilio WhatsApp ──► your phone
```

1. **Scan** — Click **Scan Gmail Now**. PingMate fetches emails from the last 180 days (read-only).
2. **Filter** — OTPs, receipts and other emails without opportunity keywords are skipped locally, without calling the AI.
3. **Analyse** — Remaining emails go to the Groq LLM, which returns structured JSON (title, company, category, deadline, link, priority). Relative dates such as "this Friday" are resolved against the email's received date.
4. **Schedule** — For each opportunity with a deadline, up to three WhatsApp reminders are created:
   - **Day before** at your reminder time
   - **On the day** at your reminder time (only if that is before the deadline)
   - **Last chance** — N hours before the deadline
5. **Deliver** — A scheduler sends due reminders through Twilio WhatsApp. Marking an opportunity **Applied** or **Ignored** cancels its reminders.

Groq's free tier allows only a few requests per minute, so a large first scan finishes in the background: each minute another batch of emails is analysed and the dashboard refreshes automatically.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Auth | Auth.js (NextAuth v5) with Google OAuth, database sessions |
| Email | Gmail API (`gmail.readonly`) |
| AI | Groq (`openai/gpt-oss-120b`) through the OpenAI-compatible SDK |
| WhatsApp | Twilio WhatsApp API |
| Scheduling | `node-cron` locally; a cron call to `/api/reminders/process` when hosted |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or newer
- A PostgreSQL database (a free [Supabase](https://supabase.com) project works)
- A Google Cloud project with an OAuth client and the Gmail API enabled
- A [Groq](https://console.groq.com) API key
- A [Twilio](https://www.twilio.com) account with the WhatsApp sandbox

### Setup

```bash
git clone https://github.com/Shweta181211/PingMate.git
cd PingMate
npm install
cp .env.example .env      # then fill in your values
npx prisma db push        # create the database tables
npm run dev
```

Open <http://localhost:3000>, sign in with Google and tick **"View your email messages"** on Google's consent screen.

Step-by-step instructions for every service are in **[INSTALLATION.md](INSTALLATION.md)**.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_URL` | ✅ | App URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | ✅ | Session secret (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client |
| `GROQ_API_KEY` | Recommended | AI analysis (a keyword fallback is used without it) |
| `GROQ_MODEL` | Optional | Override the model (default `openai/gpt-oss-120b`) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` | For WhatsApp | Sending reminders and OTPs |
| `CRON_SECRET` | For hosting | Protects `/api/reminders/process` |
| `NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER` / `NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE` | Optional | Shown in the UI so users can join the sandbox |
| `RECRUITSAGE_SENDER_DOMAINS` | Optional | Extra sender domains for Recruitsage detection |

See [.env.example](.env.example) for the full template. **Never commit your `.env` file.**

---

## 💬 WhatsApp Notes

PingMate uses the Twilio **WhatsApp sandbox** during development:

- Each recipient must first send the sandbox's `join <word>` phrase to the sandbox number.
- The sandbox can only message a number within **24 hours** of that number's last message to it. If delivery is blocked, PingMate shows a warning and retries waiting reminders every 15 minutes.
- Use **Settings → Send test message** to confirm delivery.

For real users, a registered WhatsApp Business sender with approved message templates is needed. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📁 Project Structure

```
PingMate/
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # SQL for existing databases
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/               # Auth.js handler
│   │   │   ├── dashboard/stats/    # Dashboard summary
│   │   │   ├── emails/             # Gmail scan + analysis
│   │   │   ├── gmail/reconnect/    # Re-grant Gmail access
│   │   │   ├── opportunities/      # List, update, delete
│   │   │   ├── reminders/process/  # Cron endpoint: send due reminders
│   │   │   ├── settings/           # Reminder preferences
│   │   │   └── whatsapp/verify/    # OTP verification + test message
│   │   ├── auth/                   # Sign-in and error pages
│   │   ├── dashboard/              # Dashboard, opportunities, settings
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css
│   ├── components/dashboard/       # Client providers
│   ├── lib/
│   │   ├── ai.ts                   # Groq email analysis
│   │   ├── auth.ts                 # Auth.js configuration
│   │   ├── email-processing.ts     # Analyse stored emails in batches
│   │   ├── gmail.ts                # Gmail API client + error handling
│   │   ├── prisma.ts               # Prisma client
│   │   ├── recruitsage.ts          # Recruitsage detection
│   │   ├── reminder-scheduler.ts   # Reminder scheduling + delivery
│   │   ├── utils.ts
│   │   └── whatsapp.ts             # Twilio WhatsApp
│   ├── instrumentation.ts          # Starts the local scheduler
│   └── instrumentation-node.ts
├── .env.example
├── vercel.json                     # Cron configuration
└── package.json
```

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (also runs the reminder scheduler) |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Start the production server |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio |

---

## 📚 Documentation

- [INSTALLATION.md](INSTALLATION.md) — detailed local setup
- [DEPLOYMENT.md](DEPLOYMENT.md) — hosting, cron and WhatsApp production notes
- [ARCHITECTURE.md](ARCHITECTURE.md) — design decisions
- [API_REFERENCE.md](API_REFERENCE.md) — API endpoints

---

## 🎓 Built For

College students who get important emails about internships, placements, hackathons, scholarships and competitions but miss deadlines because of inbox overload.

---

## 👩‍💻 Author

**Shweta Agarwal** — [@Shweta181211](https://github.com/Shweta181211)
