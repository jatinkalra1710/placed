"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { CITIES, CitySlug } from "@/lib/cities";
import { BIO_MAX_WORDS } from "@/lib/config";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [branch, setBranch] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState<CitySlug>(CITIES[0].slug);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      if (data.user.user_metadata?.full_name) {
        setFullName(data.user.user_metadata.full_name);
      }
    });
  }, [supabase, router]);

  const bioWords = wordCount(bio);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Attach a screenshot of your accepted offer — this part is required so we can confirm you're placed, but only your admin ever sees it.");
      return;
    }
    if (bioWords > BIO_MAX_WORDS) {
      setError(`Keep your bio under ${BIO_MAX_WORDS} words — it's currently ${bioWords}.`);
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          batch_year: batchYear ? Number(batchYear) : null,
          branch,
          bio,
        })
        .eq("id", userId);
      if (profileErr) throw profileErr;

      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("offer-screenshots")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("verifications").insert({
        user_id: userId,
        company_name: company,
        city,
        screenshot_path: path,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      router.replace("/pending");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-lg px-5 py-14"
      >
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          One quick form
        </p>
        <h1 className="mt-3 font-mono text-2xl font-bold text-paper">
          Tell your batch where you're headed
        </h1>
        <p className="mt-2 text-sm text-slate">
          This is what your batchmates will see about you — take a moment to
          make it feel like you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate">Full name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate">Batch year</label>
              <input
                required
                type="number"
                placeholder="2027"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate">Branch</label>
            <input
              required
              placeholder="Computer Science"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
            />
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-xs text-slate">Bio (optional)</label>
              <span className={`font-mono text-[11px] ${bioWords > BIO_MAX_WORDS ? "text-rust" : "text-slate"}`}>
                {bioWords}/{BIO_MAX_WORDS} words
              </span>
            </div>
            <textarea
              placeholder="A couple lines about you — hobbies, what you're looking forward to, what kind of flatmate you'd be…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate">Company</label>
            <input
              required
              placeholder="e.g. Microsoft"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate">
              Job location (city group)
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as CitySlug)}
              className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none transition-colors focus:border-amber"
            >
              {CITIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deliberately understated — this step exists purely so an admin can
              confirm you're actually placed. Nobody sees your package/CTC and
              it's never shown alongside your name anywhere in the app. */}
          <div className="rounded-lg border border-dashed border-inkline/70 bg-inkline/10 p-4">
            <label className="block text-xs text-slate">
              Proof of offer{" "}
              <span className="text-slate/70">
                — private, admin-only, no one sees your package
              </span>
            </label>
            <input
              required
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full text-xs text-slate file:mr-3 file:rounded file:border-0 file:bg-inkline file:px-3 file:py-1.5 file:text-paper/80"
            />
            <p className="mt-2 text-[11px] text-slate/70">
              A screenshot of your offer email or portal is fine. You can crop
              out anything you'd rather not show — we just need company + your
              name visible.
            </p>
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-amber px-5 py-3 font-semibold text-ink transition-colors hover:bg-amber/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Join the batch"}
          </motion.button>
        </form>
      </motion.section>
    </main>
  );
}
