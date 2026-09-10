"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

interface Reply {
  id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  replies: Reply[];
}

export default function SupportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);
      await fetchTickets(userData.user.id);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function fetchTickets(uid: string) {
    const { data: ticketRows } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const withReplies: Ticket[] = [];
    for (const t of ticketRows ?? []) {
      const { data: replies } = await supabase
        .from("support_replies")
        .select("id, body, is_admin, created_at")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: true });
      withReplies.push({ ...t, replies: replies ?? [] } as Ticket);
    }
    setTickets(withReplies);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    await supabase.from("support_tickets").insert({
      user_id: userId,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubject("");
    setMessage("");
    setShowForm(false);
    setSubmitting(false);
    await fetchTickets(userId);
  }

  async function sendReply(ticketId: string) {
    const body = replyDrafts[ticketId]?.trim();
    if (!body || !userId) return;
    await supabase.from("support_replies").insert({
      ticket_id: ticketId,
      user_id: userId,
      body,
      is_admin: false,
    });
    setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
    await fetchTickets(userId);
  }

  async function closeTicket(ticketId: string) {
    if (!userId) return;
    await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", ticketId);
    await fetchTickets(userId);
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center font-mono text-sm text-slate">
          Loading support…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Support
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-paper">
          Need help with something?
        </h1>
        <p className="mt-1 text-sm text-slate">
          Works even if your offer hasn't been verified yet — an admin will
          get back to you here.
        </p>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="mt-5 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-ink hover:bg-amber/90"
        >
          {showForm ? "Cancel" : "+ New ticket"}
        </button>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={submitTicket}
              className="mt-4 space-y-3 overflow-hidden glass-card p-5"
            >
              <input
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
              />
              <textarea
                placeholder="Describe the issue…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 space-y-4">
          {tickets.length === 0 && (
            <p className="text-sm text-slate">No tickets yet.</p>
          )}
          {tickets.map((t) => (
            <div key={t.id} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-paper">{t.subject}</p>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                    t.status === "open"
                      ? "bg-amber/15 text-amber"
                      : "bg-signal/15 text-signal"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate">{t.message}</p>

              {t.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-inkline pt-3">
                  {t.replies.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        r.is_admin ? "border border-amber/30 text-paper/90" : "bg-inkline/30 text-paper/90"
                      }`}
                    >
                      {r.is_admin && (
                        <span className="mr-1 font-mono text-[10px] uppercase text-amber">Admin:</span>
                      )}
                      {r.body}
                    </div>
                  ))}
                </div>
              )}

              {t.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyDrafts[t.id] ?? ""}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Reply…"
                    className="glass-input flex-1 rounded-full px-3 py-1.5 text-xs text-paper outline-none"
                  />
                  <button
                    onClick={() => sendReply(t.id)}
                    className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber/90"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => closeTicket(t.id)}
                    className="rounded-full border border-inkline px-3 py-1.5 text-xs text-paper/80 hover:border-signal hover:text-signal"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
