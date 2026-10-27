"use client";

import { useEffect, useState } from "react";

interface Settings {
  whatsappNumber: string | null;
  whatsappVerified: boolean;
  remindersEnabled: boolean;
  reminderDayBefore: boolean;
  reminderSameDayMorn: boolean;
  reminderFourHours: boolean;
  reminderTime: string;
  reminderHoursBefore: number;
  whatsappLastError: string | null;
  gmailConnected: boolean;
  lastGmailSync: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data.whatsappNumber) setPhone(data.whatsappNumber);
      });
  }, []);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  async function sendOTP() {
    if (!phone || phone.length < 10) {
      showMessage("Enter a valid phone number (with country code, e.g. +91...)", "error");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/whatsapp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", phoneNumber: phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setOtpSent(true);
      showMessage("OTP sent! Check your WhatsApp.", "success");
    } else {
      showMessage(data.error || "Failed to send OTP", "error");
    }
  }

  async function verifyOTP() {
    if (!otp || otp.length !== 6) {
      showMessage("Enter the 6-digit OTP", "error");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/whatsapp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      showMessage("✅ WhatsApp verified!", "success");
      setOtpSent(false);
      setOtp("");
      // Refresh settings
      fetch("/api/settings").then((r) => r.json()).then(setSettings);
    } else {
      showMessage(data.error || "Invalid OTP", "error");
    }
  }

  async function updateSetting(key: string, value: boolean | string | number) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    const data = await res.json();
    if (res.ok) {
      setSettings(data);
      showMessage("Saved. Upcoming reminders were rescheduled.", "success");
    } else {
      showMessage(data.error || "Could not save setting", "error");
    }
  }

  async function sendTestMessage() {
    setTesting(true);
    const res = await fetch("/api/whatsapp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    const data = await res.json();
    setTesting(false);
    showMessage(res.ok ? `✅ ${data.message}` : data.error || "Test message failed", res.ok ? "success" : "error");
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }

  if (!settings) {
    return <div className="text-gray-500 py-20 text-center">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-300"
              : "bg-red-500/10 border border-red-500/20 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* WhatsApp */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="font-semibold text-white">WhatsApp Number</h2>
            <p className="text-xs text-gray-400">Receive reminders on WhatsApp</p>
          </div>
          {settings.whatsappVerified && (
            <span className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs">
              ✓ Verified
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={sendOTP}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </div>

          {otpSent && (
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={verifyOTP}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 transition-all text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {settings.whatsappVerified && (
            <button
              onClick={sendTestMessage}
              disabled={testing}
              className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 transition-all text-sm font-medium text-white disabled:opacity-60"
            >
              {testing ? "Sending…" : "Send test message"}
            </button>
          )}

          {settings.whatsappLastError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <strong>Last delivery failed:</strong> {settings.whatsappLastError}
            </div>
          )}

          <p className="text-xs text-gray-500">
            💡 Twilio sandbox rules: send{" "}
            <span className="text-indigo-400">
              &ldquo;{process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE || "join <your-sandbox-word>"}&rdquo;
            </span>{" "}
            to <span className="text-indigo-400">{process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER || "+14155238886"}</span>{" "}
            on WhatsApp. The sandbox can only message you within 24 hours of your last message to it, so
            send it any message once a day to keep reminders flowing.
          </p>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔔</span>
          <div>
            <h2 className="font-semibold text-white">Reminder Settings</h2>
            <p className="text-xs text-gray-400">Configure when to receive reminders</p>
          </div>
        </div>

        <div className="space-y-4">
          <Toggle
            label="Enable all reminders"
            description="Master switch for all WhatsApp reminders"
            checked={settings.remindersEnabled}
            onChange={(v) => updateSetting("remindersEnabled", v)}
          />
          <hr className="border-white/5" />
          <div className={`grid gap-4 sm:grid-cols-2 ${settings.remindersEnabled ? "" : "opacity-50"}`}>
            <label className="text-sm">
              <span className="block font-medium text-white">Reminder time</span>
              <span className="block text-xs text-gray-400 mb-2">India time, for day-before and on-the-day reminders</span>
              <input
                type="time"
                value={settings.reminderTime}
                disabled={!settings.remindersEnabled}
                onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
                onBlur={(e) => e.target.value && updateSetting("reminderTime", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </label>
            <label className="text-sm">
              <span className="block font-medium text-white">Last-chance reminder</span>
              <span className="block text-xs text-gray-400 mb-2">How long before the deadline</span>
              <select
                value={settings.reminderHoursBefore}
                disabled={!settings.remindersEnabled}
                onChange={(e) => updateSetting("reminderHoursBefore", Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                  <option key={h} value={h} className="bg-gray-900">
                    {h} hour{h === 1 ? "" : "s"} before
                  </option>
                ))}
              </select>
            </label>
          </div>
          <hr className="border-white/5" />
          <Toggle
            label="Day before the deadline"
            description={`WhatsApp at ${formatTime(settings.reminderTime)} the day before`}
            checked={settings.reminderDayBefore}
            disabled={!settings.remindersEnabled}
            onChange={(v) => updateSetting("reminderDayBefore", v)}
          />
          <Toggle
            label="On the deadline day"
            description={`WhatsApp at ${formatTime(settings.reminderTime)} on the day itself`}
            checked={settings.reminderSameDayMorn}
            disabled={!settings.remindersEnabled}
            onChange={(v) => updateSetting("reminderSameDayMorn", v)}
          />
          <Toggle
            label="Last-chance reminder"
            description={`WhatsApp ${settings.reminderHoursBefore} hour${settings.reminderHoursBefore === 1 ? "" : "s"} before the deadline`}
            checked={settings.reminderFourHours}
            disabled={!settings.remindersEnabled}
            onChange={(v) => updateSetting("reminderFourHours", v)}
          />
        </div>
      </div>

      {/* Gmail Status */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📧</span>
          <div>
            <h2 className="font-semibold text-white">Gmail Connection</h2>
            <p className="text-xs text-gray-400">Auto-scans your inbox for opportunities</p>
          </div>
          <span
            className={`ml-auto px-3 py-1 rounded-full text-xs ${
              settings.gmailConnected
                ? "bg-green-500/20 text-green-300"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {settings.gmailConnected ? "✓ Connected" : "Not synced"}
          </span>
        </div>
        {settings.lastGmailSync && (
          <p className="text-xs text-gray-500">
            Last synced: {new Date(settings.lastGmailSync).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          To resync, go to Dashboard and click &ldquo;Scan Gmail Now&rdquo;.
        </p>
      </div>
    </div>
  );
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${disabled ? "opacity-50" : ""}`}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
          checked ? "bg-indigo-600" : "bg-gray-700"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
