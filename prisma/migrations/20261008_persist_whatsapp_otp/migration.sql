-- Persist WhatsApp verification across serverless instances and deployments.
-- Safe to apply to an existing Supabase database.
ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "whatsappOtpHash" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappOtpExpiresAt" TIMESTAMP(3);
