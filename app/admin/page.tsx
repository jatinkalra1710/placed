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
  screenshot_path: string;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
  signedUrl?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
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
    }
    load();
  }, [supabase, router]);

  async function fetchPending() {
    const { data } = await supabase
      .from("verifications")
      .select(
        "id, company_name, city, screenshot_path, status, created_at, profiles(full_name, email)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const withUrls: Row[] = [];
    for (const r of (data ?? []) as any[]) {
      const { data: signed } = await supabase.storage
        .from("offer-screenshots")
        .createSignedUrl(r.screenshot_path, 60 * 10);
      withUrls.push({
        id: r.id,
        company_name: r.company_name,
        city: r.city,
        screenshot_path: r.screenshot_path,
        status: r.status,
        created_at: r.created_at,
        full_name: r.profiles?.full_name ?? "—",
        email: r.profiles?.email ?? "—",
        signedUrl: signed?.signedUrl,
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
      <section className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
              Admin
            </p>
            <h1 className="mt-2 font-mono text-2xl font-bold text-paper">
              Pending verifications ({rows.length})
            </h1>
          </div>
          <a
            href="/dashboard"
            className="rounded border border-inkline px-3 py-2 text-xs text-paper/80 hover:border-amber hover:text-amber"
          >
            My board →
          </a>
        </div>

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
                className="glass-card p-5"
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
                      className="rounded bg-signal px-3 py-1.5 text-sm font-semibold text-ink hover:bg-signal/90 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                      className="rounded bg-rust px-3 py-1.5 text-sm font-semibold text-ink hover:bg-rust/90 disabled:opacity-50"
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
                    className="mt-4 block overflow-hidden rounded border border-inkline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.signedUrl}
                      alt="Offer screenshot"
                      className="max-h-72 w-full object-contain bg-black"
                    />
                  </a>
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
                        className="mt-2 rounded bg-rust px-3 py-1.5 text-xs font-semibold text-ink hover:bg-rust/90 disabled:opacity-50"
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
      </section>
    </main>
  );
}
