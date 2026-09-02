"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { BIO_MAX_WORDS } from "@/lib/config";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [bio, setBio] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);
      setEmail(userData.user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, branch, batch_year, bio")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setBranch(profile.branch || "");
        setBatchYear(profile.batch_year ? String(profile.batch_year) : "");
        setBio(profile.bio || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const bioWords = wordCount(bio);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || bioWords > BIO_MAX_WORDS) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        branch,
        batch_year: batchYear ? Number(batchYear) : null,
        bio,
      })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center font-mono text-sm text-slate">
          Loading your profile…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-5 py-14"
      >
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Your profile
        </p>
        <h1 className="mt-2 font-mono text-2xl font-bold text-paper">
          Edit your details
        </h1>
        <p className="mt-1 font-mono text-xs text-slate">{email}</p>

        <form onSubmit={save} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate">Batch year</label>
              <input
                type="number"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate">Branch</label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-xs text-slate">Bio</label>
              <span className={`font-mono text-[11px] ${bioWords > BIO_MAX_WORDS ? "text-rust" : "text-slate"}`}>
                {bioWords}/{BIO_MAX_WORDS} words
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
            />
          </div>

          <button
            type="submit"
            disabled={saving || bioWords > BIO_MAX_WORDS}
            className="w-full rounded bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </form>
      </motion.section>
    </main>
  );
}
