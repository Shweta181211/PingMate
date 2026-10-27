-- Custom reminder times, WhatsApp delivery diagnostics and AI re-analysis.
-- Additive and safe to apply to an existing Supabase database.
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "reminderTime" TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS "reminderHoursBefore" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "whatsappLastError" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappLastErrorAt" TIMESTAMP(3);

ALTER TABLE "Email"
  ADD COLUMN IF NOT EXISTS "aiAnalyzed" BOOLEAN NOT NULL DEFAULT false;
