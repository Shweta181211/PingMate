"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { formatDeadline, getCategoryColor } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  total: number;
  upcoming: number;
  applied: number;
  missed: number;
}

interface Opportunity {
  id: string;
  title: string;
  companyName: string | null;
  category: string;
  deadline: string | null;
  priority: string;
  status: string;
  registrationLink: string | null;
}

interface UpcomingReminder {
  id: string;
  type: string;
  scheduledAt: string;
  opportunity: { title: string; deadline: string | null };
}

interface DashboardData {
  stats: Stats;
  todayDeadlines: Opportunity[];
  thisWeek: Opportunity[];
  upcomingReminders: UpcomingReminder[];
  pendingAnalysis: number;
  settings: {
    whatsappVerified: boolean;
    gmailConnected: boolean;
    remindersEnabled: boolean;
    lastGmailSync: string | null;
    whatsappLastError: string | null;
  } | null;
}

const REMINDER_LABELS: Record<string, string> = {
  DAY_BEFORE: "Day before",
  SAME_DAY_MORNING: "On the day",
  FOUR_HOURS_BEFORE: "Last chance",
  CUSTOM: "Portal alert",
};

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [reconnectRequired, setReconnectRequired] = useState(false);
  const autoSyncAttempted = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh while the background job is still analysing emails.
  const analysing = (data?.pendingAnalysis ?? 0) > 0;
  useEffect(() => {
    if (!analysing) return;
    const timer = setInterval(fetchData, 30_000);
    return () => clearInterval(timer);
  }, [analysing]);

  async function fetchData() {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      // The first successful Google sign-in should immediately make the
      // inbox useful—no extra "scan" step required from the user.
      if (!json.settings?.lastGmailSync && !autoSyncAttempted.current) {
        autoSyncAttempted.current = true;
        void syncEmails();
      }
    }
  }

  async function syncEmails() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/emails", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setReconnectRequired(false);
        const portalNote = json.recruitsageUpdates
          ? ` · ${json.recruitsageUpdates} Recruitsage alert${json.recruitsageUpdates === 1 ? "" : "s"} queued`
          : "";
        const sentNote = json.remindersSent
          ? ` · ${json.remindersSent} WhatsApp alert${json.remindersSent === 1 ? "" : "s"} sent`
          : "";
        const pendingNote = json.pendingAnalysis
          ? ` · ${json.pendingAnalysis} more email${json.pendingAnalysis === 1 ? "" : "s"} will be analysed in the background over the next few minutes`
          : "";
        setSyncResult(
          `✅ Scanned ${json.scanned} emails (${json.newEmails} new), analysed ${json.processed}, found ${json.opportunitiesFound} opportunities${portalNote}${sentNote}${pendingNote}`
        );
        fetchData();
      } else {
        setSyncResult(`❌ ${json.error}`);
        setReconnectRequired(
          json.code === "GMAIL_RECONNECT_REQUIRED" || json.code === "GMAIL_PERMISSION_MISSING"
        );
      }
    } catch {
      setSyncResult("❌ Network error");
    }
    setSyncing(false);
  }

  async function reconnectGmail() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/gmail/reconnect", { method: "POST" });
    if (!res.ok) {
      setSyncResult("❌ Could not reset Gmail access. Please try again.");
      setSyncing(false);
      return;
    }
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  const statCards = [
    { label: "Total Opportunities", value: data?.stats.total ?? 0, icon: "🎯", color: "indigo" },
    { label: "Upcoming Deadlines", value: data?.stats.upcoming ?? 0, icon: "⏰", color: "orange" },
    { label: "Applied", value: data?.stats.applied ?? 0, icon: "✅", color: "green" },
    { label: "Missed", value: data?.stats.missed ?? 0, icon: "❌", color: "red" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data?.settings?.lastGmailSync
              ? `Last synced: ${new Date(data.settings.lastGmailSync).toLocaleString()}`
              : "Not synced yet"}
          </p>
        </div>
        <button
          onClick={syncEmails}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all font-medium text-sm disabled:opacity-60"
        >
          <span className={syncing ? "animate-spin" : ""}>🔄</span>
          {syncing ? "Scanning Gmail..." : "Scan Gmail Now"}
        </button>
      </div>

      {/* Setup Banner */}
      {data && (!data.settings?.whatsappVerified || !data.settings?.gmailConnected) && (
        <div className="glass-card rounded-2xl p-5 mb-6 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-200 mb-1">
                Complete your setup
              </h3>
              <div className="space-y-1 text-sm text-gray-400">
                {!data.settings?.gmailConnected && (
                  <p>
                    📧 Gmail permission is missing.{" "}
                    <button onClick={reconnectGmail} className="text-indigo-400 underline">
                      Grant Gmail access
                    </button>{" "}
                    and tick &ldquo;View your email messages&rdquo; on Google&apos;s screen.
                  </p>
                )}
                {!data.settings?.whatsappVerified && (
                  <p>
                    💬 <Link href="/dashboard/settings" className="text-indigo-400 underline">Verify your WhatsApp number</Link> to receive reminders
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {syncResult && (
        <div className="glass-card rounded-xl p-4 mb-6 border border-white/10 text-sm flex flex-wrap items-center gap-3">
          <span>{syncResult}</span>
          {reconnectRequired && <button onClick={reconnectGmail} disabled={syncing} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60">Grant Gmail access →</button>}
        </div>
      )}

      {data?.settings?.whatsappLastError && (
        <div className="glass-card rounded-2xl p-5 mb-6 border border-red-500/20">
          <h3 className="font-semibold text-red-400 mb-1">⚠️ WhatsApp reminders are not being delivered</h3>
          <p className="text-sm text-gray-400">{data.settings.whatsappLastError}</p>
          <p className="text-xs text-gray-500 mt-2">
            Waiting reminders are retried automatically every 15 minutes.{" "}
            <Link href="/dashboard/settings" className="text-indigo-400 underline">Send a test message</Link>{" "}
            once you&apos;ve done this.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-5">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-xs text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Deadlines */}
      {data?.todayDeadlines && data.todayDeadlines.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🔥 Today&apos;s Deadlines
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
              {data.todayDeadlines.length}
            </span>
          </h2>
          <div className="space-y-3">
            {data.todayDeadlines.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} onUpdate={fetchData} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming WhatsApp reminders */}
      <div className="glass-card rounded-2xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">💬 Upcoming WhatsApp reminders</h2>
          <Link href="/dashboard/settings" className="text-xs text-indigo-400 underline">Change times</Link>
        </div>
        {data?.upcomingReminders?.length ? (
          <ul className="space-y-2">
            {data.upcomingReminders.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-white truncate max-w-full">{r.opportunity.title}</span>
                <span className="text-gray-400 text-xs">
                  {REMINDER_LABELS[r.type] ?? r.type} · {formatIst(r.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No reminders scheduled yet. Reminders are created for opportunities that have a deadline.
            {data?.pendingAnalysis ? ` ${data.pendingAnalysis} emails are still being analysed.` : ""}
          </p>
        )}
      </div>

      {/* This Week */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📅 This Week
          {data?.thisWeek && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
              {data.thisWeek.length}
            </span>
          )}
        </h2>
        {data?.thisWeek && data.thisWeek.length > 0 ? (
          <div className="space-y-3">
            {data.thisWeek.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} onUpdate={fetchData} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-10 text-center text-gray-500">
            <p className="text-3xl mb-3">🎉</p>
            <p>No deadlines this week!</p>
            <p className="text-sm mt-1">Click &ldquo;Scan Gmail&rdquo; to find opportunities.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onUpdate,
}: {
  opportunity: Opportunity;
  onUpdate: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function updateStatus(status: string) {
    setUpdating(true);
    await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onUpdate();
    setUpdating(false);
  }

  const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-indigo-500/20 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(
                opportunity.category
              )}`}
            >
              {opportunity.category}
            </span>
            {opportunity.priority === "HIGH" && (
              <span className="text-xs text-red-400">🔴 HIGH</span>
            )}
          </div>
          <h3 className="font-semibold text-white truncate">{opportunity.title}</h3>
          {opportunity.companyName && (
            <p className="text-sm text-gray-400">{opportunity.companyName}</p>
          )}
          {deadline && (
            <p className="text-sm text-orange-400 mt-1">
              ⏰ {formatDeadline(deadline)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {opportunity.registrationLink && (
            <a
              href={opportunity.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs hover:bg-indigo-600/30 transition-all"
            >
              Apply →
            </a>
          )}
          <button
            onClick={() => updateStatus("APPLIED")}
            disabled={updating}
            className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-300 text-xs hover:bg-green-600/30 transition-all"
          >
            ✓ Applied
          </button>
          <button
            onClick={() => updateStatus("IGNORED")}
            disabled={updating}
            className="px-3 py-1.5 rounded-lg bg-gray-600/20 text-gray-400 text-xs hover:bg-gray-600/30 transition-all"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
