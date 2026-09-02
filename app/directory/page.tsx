"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { cityBySlug } from "@/lib/cities";
import { DirectoryResult } from "@/lib/types";

export default function DirectoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [results, setResults] = useState<DirectoryResult[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: mine } = await supabase
        .from("verifications")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (!mine) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);

      const { data } = await supabase
        .from("verifications")
        .select("user_id, company_name, city, profiles!verifications_user_id_fkey(full_name, branch, batch_year, bio)")
        .eq("status", "approved");

      setResults(
        (data ?? []).map((r: any) => ({
          user_id: r.user_id,
          full_name: r.profiles?.full_name ?? "—",
          branch: r.profiles?.branch ?? null,
          batch_year: r.profiles?.batch_year ?? null,
          bio: r.profiles?.bio ?? "",
          company_name: r.company_name,
          city: r.city,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.toLowerCase();
    return results.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q)
    );
  }, [results, query]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center font-mono text-sm text-slate">
          Loading the batch directory…
        </p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-widest2 text-rust">
            No access yet
          </p>
          <h1 className="mt-3 font-mono text-xl font-bold text-paper">
            Get verified first
          </h1>
          <p className="mt-2 text-sm text-slate">
            You'll unlock the full batch directory once your offer is
            approved.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90"
          >
            Go to dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Whole batch
        </p>
        <h1 className="mt-2 font-mono text-2xl font-bold text-paper">
          Find people
        </h1>
        <p className="mt-1 text-sm text-slate">
          Search across every city — by name or by company.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try 'Bain', 'Microsoft', or a name…"
          className="mt-5 w-full rounded glass-input px-4 py-3 text-sm text-paper outline-none focus:border-amber"
          autoFocus
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.length === 0 && (
            <p className="text-sm text-slate">No matches.</p>
          )}
          <AnimatePresence>
            {filtered.map((r, i) => (
              <motion.div
                key={r.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card p-4 transition-colors hover:border-amber/40"
              >
                <p className="font-medium text-paper">{r.full_name}</p>
                <p className="mt-0.5 text-xs text-slate">
                  {r.company_name}
                  {r.branch ? ` · ${r.branch}` : ""} ·{" "}
                  {cityBySlug(r.city)?.name ?? r.city}
                </p>
                {r.bio && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate/80">{r.bio}</p>
                )}
                <a
                  href={`/messages/${r.user_id}`}
                  className="mt-3 inline-block rounded border border-inkline px-2.5 py-1 text-[11px] text-amber hover:border-amber"
                >
                  Message
                </a>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
