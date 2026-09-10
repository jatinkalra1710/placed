"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { cityBySlug } from "@/lib/cities";

interface Row {
  id: string;
  company_name: string;
  city: string;
  screenshot_path: string | null;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
  signedUrl?: string;
}

interface ReportRow {
  id: string;
  reason: string;
  created_at: string;
  post_id: string;
  post_title: string;
  reporter_name: string;
}

interface TicketRow {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  requester_name: string;
  reply?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      await fetchPending();
      await fetchReports();
      await fetchTickets();
    }
    load();
  }, [supabase, router]);

  async function fetchTickets() {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, message, created_at, profiles(full_name)")
      .eq("status", "open")
      .order("created_at", { ascending: true });

    setTickets(
      (data ?? []).map((t: any) => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        created_at: t.created_at,
        requester_name: t.profiles?.full_name ?? "someone",
      }))
    );
  }

  async function replyToTicket(ticketId: string) {
    const body = tickets.find((t) => t.id === ticketId)?.reply?.trim();
    if (!body) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("support_replies").insert({
      ticket_id: ticketId,
      user_id: userData.user.id,
      body,
      is_admin: true,
    });
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  async function resolveTicket(ticketId: string) {
    await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", ticketId);
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  async function fetchReports() {
    const { data } = await supabase
      .from("post_reports")
      .select(
        "id, reason, created_at, post_id, posts(title), profiles!post_reports_reporter_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false });

    setReports(
      (data ?? []).map((r: any) => ({
        id: r.id,
        reason: r.reason,
        created_at: r.created_at,
        post_id: r.post_id,
        post_title: r.posts?.title ?? "(deleted post)",
        reporter_name: r.profiles?.full_name ?? "someone",
      }))
    );
  }

  async function deleteReportedPost(postId: string, reportId: string) {
    await supabase.from("posts").delete().eq("id", postId);
    await supabase.from("post_reports").delete().eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function dismissReport(reportId: string) {
    await supabase.from("post_reports").delete().eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function fetchPending() {
    const { data } = await supabase
      .from("verifications")
      .select(
        "id, company_name, city, screenshot_path, status, created_at, profiles!verifications_user_id_fkey(full_name, email)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const withUrls: Row[] = [];
    for (const r of (data ?? []) as any[]) {
      let signedUrl: string | undefined;
      if (r.screenshot_path) {
        const { data: signed } = await supabase.storage
          .from("offer-screenshots")
          .createSignedUrl(r.screenshot_path, 60 * 10);
        signedUrl = signed?.signedUrl;
      }
      withUrls.push({
        id: r.id,
        company_name: r.company_name,
        city: r.city,
        screenshot_path: r.screenshot_path,
        status: r.status,
        created_at: r.created_at,
        full_name: r.profiles?.full_name ?? "—",
        email: r.profiles?.email ?? "—",
        signedUrl,
      });
    }
    setRows(withUrls);
  }

  async function approve(id: string) {
    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("verifications")
      .update({ status: "approved", reviewed_by: userData.user?.id })
      .eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setBusyId(null);
  }

  async function reject(id: string) {
    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("verifications")
      .update({
        status: "rejected",
        reviewed_by: userData.user?.id,
        review_note: rejectNote.trim() || null,
      })
      .eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setBusyId(null);
    setRejectingId(null);
    setRejectNote("");
  }

  const [tab, setTab] = useState<"pending" | "reports" | "tickets">("pending");

  if (isAdmin === null) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center text-slate">
          Loading…
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center text-slate">
          You don't have admin access.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
              Admin
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-paper sm:text-3xl">
              Control room
            </h1>
            <p className="mt-1 text-xs text-slate">
              Access is self-serve now — approving here only adds a ✓ badge, it doesn't grant access.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-full border border-inkline px-3 py-2 text-xs text-paper/80 hover:border-amber hover:text-amber"
          >
            My board →
          </a>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {[
            { key: "pending" as const, label: "Pending", count: rows.length, color: "amber" },
            { key: "reports" as const, label: "Reports", count: reports.length, color: "rust" },
            { key: "tickets" as const, label: "Tickets", count: tickets.length, color: "signal" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-amber text-ink" : "glass text-paper/80"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[10px] ${
                    tab === t.key ? "bg-ink/20 text-ink" : "bg-rust text-white"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "pending" && (
        <div className="mt-6 space-y-5">
          {rows.length === 0 && (
            <p className="text-sm text-slate">Nothing waiting on review.</p>
          )}
          <AnimatePresence>
            {rows.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="glass-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-paper">{r.full_name}</p>
                    <p className="font-mono text-xs text-slate">{r.email}</p>
                    <p className="mt-1 text-sm text-paper/90">
                      {r.company_name} · {cityBySlug(r.city)?.name ?? r.city}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => approve(r.id)}
                      className="rounded-full bg-signal px-3 py-1.5 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                      className="rounded-full bg-rust px-3 py-1.5 text-sm font-semibold text-ink hover:bg-rust/90 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {r.signedUrl && (
                  <a
                    href={r.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block overflow-hidden rounded-xl border border-inkline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.signedUrl}
                      alt="Offer screenshot"
                      className="max-h-72 w-full object-contain bg-black"
                    />
                  </a>
                )}
                {!r.signedUrl && (
                  <p className="mt-4 rounded-xl border border-dashed border-inkline/70 bg-inkline/10 px-3 py-2 text-xs text-slate">
                    No screenshot provided — approve based on name/company alone, or message them to ask for one.
                  </p>
                )}

                <AnimatePresence>
                  {rejectingId === r.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Optional note for the student — e.g. 'screenshot doesn't show your name'"
                        rows={2}
                        className="w-full rounded glass-input px-3 py-2 text-sm text-paper outline-none focus:border-rust"
                      />
                      <button
                        onClick={() => reject(r.id)}
                        disabled={busyId === r.id}
                        className="mt-2 rounded-full bg-rust px-3 py-1.5 text-xs font-semibold text-ink hover:bg-rust/90 disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}

        {tab === "reports" && (
        <div className="mt-6 space-y-3">
          {reports.length === 0 && (
            <p className="text-sm text-slate">Nothing reported. 🎉</p>
          )}
          <AnimatePresence>
            {reports.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="glass-card p-4"
              >
                <p className="text-sm text-paper/90">
                  <span className="font-medium">{r.reporter_name}</span> reported{" "}
                  <span className="font-medium">"{r.post_title}"</span>
                </p>
                <p className="mt-1 text-xs text-slate">{r.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => deleteReportedPost(r.post_id, r.id)}
                    className="rounded-full bg-rust px-3 py-1.5 text-xs font-semibold text-ink hover:bg-rust/90"
                  >
                    Delete post
                  </button>
                  <button
                    onClick={() => dismissReport(r.id)}
                    className="rounded-full border border-inkline px-3 py-1.5 text-xs text-paper/80 hover:border-amber hover:text-amber"
                  >
                    Dismiss report
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}

        {tab === "tickets" && (
        <div className="mt-6 space-y-3">
          {tickets.length === 0 && (
            <p className="text-sm text-slate">No open tickets. 🎉</p>
          )}
          <AnimatePresence>
            {tickets.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="glass-card p-4"
              >
                <p className="text-sm text-paper/90">
                  <span className="font-medium">{t.requester_name}</span> — {t.subject}
                </p>
                <p className="mt-1 text-xs text-slate">{t.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={t.reply ?? ""}
                    onChange={(e) =>
                      setTickets((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, reply: e.target.value } : x))
                      )
                    }
                    placeholder="Reply…"
                    className="glass-input min-w-0 flex-1 rounded-full px-3 py-1.5 text-xs text-paper outline-none"
                  />
                  <button
                    onClick={() => replyToTicket(t.id)}
                    className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber/90"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => resolveTicket(t.id)}
                    className="rounded-full border border-inkline px-3 py-1.5 text-xs text-paper/80 hover:border-signal hover:text-signal"
                  >
                    Resolve
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
      </section>
    </main>
  );
}
