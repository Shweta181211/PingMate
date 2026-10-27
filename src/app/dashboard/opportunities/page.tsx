"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDeadline, getCategoryColor, getPriorityColor } from "@/lib/utils";

interface Opportunity {
  id: string;
  title: string;
  companyName: string | null;
  category: string;
  deadline: string | null;
  priority: string;
  status: string;
  registrationLink: string | null;
  actionRequired: string | null;
  email: { sender: string; senderEmail: string } | null;
  reminders: Array<{ id: string; type: string; scheduledAt: string; status: string }>;
  createdAt: string;
}

const CATEGORIES = ["ALL", "INTERNSHIP", "PLACEMENT", "INTERVIEW", "HACKATHON", "COMPETITION", "SCHOLARSHIP", "EVENT", "OTHER"];
const STATUSES = ["ALL", "PENDING", "APPLIED", "IGNORED", "MISSED"];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (status !== "ALL") params.set("status", status);
    if (search) params.set("search", search);

    const res = await fetch(`/api/opportunities?${params}`);
    if (res.ok) {
      setOpportunities(await res.json());
    }
    setLoading(false);
  }, [category, status, search]);

  useEffect(() => {
    const timer = setTimeout(fetchOpportunities, 300);
    return () => clearTimeout(timer);
  }, [fetchOpportunities]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOpportunities();
  }

  async function deleteOpportunity(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    fetchOpportunities();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">All Opportunities</h1>
        <p className="text-gray-400 text-sm">{opportunities.length} found</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by company or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-gray-900">
              {c === "ALL" ? "All Categories" : c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-gray-900">
              {s === "ALL" ? "All Statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : opportunities.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center text-gray-500">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg">No opportunities found</p>
          <p className="text-sm mt-2">Try syncing Gmail from the dashboard</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const deadline = opp.deadline ? new Date(opp.deadline) : null;
            const pendingReminders = opp.reminders.filter((r) => r.status === "PENDING").length;

            return (
              <div key={opp.id} className="glass-card rounded-2xl p-6 hover:border-indigo-500/20 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getCategoryColor(opp.category)}`}>
                        {opp.category}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(opp.priority)}`}>
                        {opp.priority} priority
                      </span>
                      {opp.status !== "PENDING" && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          opp.status === "APPLIED" ? "bg-green-500/20 text-green-300" :
                          opp.status === "MISSED" ? "bg-red-500/20 text-red-300" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          {opp.status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-white text-lg mb-1">{opp.title}</h3>
                    {opp.companyName && (
                      <p className="text-gray-400 text-sm mb-2">🏢 {opp.companyName}</p>
                    )}
                    {opp.email && /recruit\s*sage/i.test(`${opp.email.sender} ${opp.email.senderEmail}`) && (
                      <span className="inline-flex mb-2 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300">
                        🎓 Recruitsage portal alert
                      </span>
                    )}
                    {opp.actionRequired && (
                      <p className="text-gray-400 text-sm mb-2">📋 {opp.actionRequired}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm mt-3">
                      {deadline && (
                        <span className={`flex items-center gap-1 ${
                          deadline < new Date() ? "text-red-400" : "text-orange-400"
                        }`}>
                          ⏰ {formatDeadline(deadline)}
                        </span>
                      )}
                      {pendingReminders > 0 && (
                        <span className="text-indigo-400 text-xs">
                          💬 {pendingReminders} reminder{pendingReminders > 1 ? "s" : ""} scheduled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {opp.registrationLink && (
                      <a
                        href={opp.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-all text-center"
                      >
                        Apply →
                      </a>
                    )}
                    {opp.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateStatus(opp.id, "APPLIED")}
                          className="px-4 py-2 rounded-lg bg-green-600/20 text-green-300 text-xs hover:bg-green-600/30 transition-all"
                        >
                          ✓ Mark Applied
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, "IGNORED")}
                          className="px-4 py-2 rounded-lg bg-gray-600/20 text-gray-400 text-xs hover:bg-gray-600/30 transition-all"
                        >
                          Ignore
                        </button>
                      </>
                    )}
                    {opp.status !== "PENDING" && (
                      <button
                        onClick={() => updateStatus(opp.id, "PENDING")}
                        className="px-4 py-2 rounded-lg bg-yellow-600/20 text-yellow-300 text-xs hover:bg-yellow-600/30 transition-all"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => deleteOpportunity(opp.id)}
                      className="px-4 py-2 rounded-lg bg-red-600/10 text-red-400 text-xs hover:bg-red-600/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
