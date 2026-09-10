"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { CITIES, CitySlug } from "@/lib/cities";
import { BIO_MAX_WORDS } from "@/lib/config";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const STEPS = ["About you", "Pick your city", "Add your offer"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [batchYear, setBatchYear] = useState("2027");
  const [branch, setBranch] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState<CitySlug | null>(null);
  const [company, setCompany] = useState("");
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

  function goNext() {
    if (!fullName.trim()) return setError("Add your name.");
    if (!branch.trim()) return setError("Add your branch.");
    if (bioWords > BIO_MAX_WORDS) return setError(`Keep your bio under ${BIO_MAX_WORDS} words.`);
    setError("");
    setStep(1);
  }

  async function joinCity() {
    if (!city) {
      setError("Pick a city to join.");
      return;
    }
    if (!userId) return;
    setSubmitting(true);
    setError("");
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

      const { error: joinErr } = await supabase
        .from("city_memberships")
        .upsert({ user_id: userId, city }, { onConflict: "user_id,city" });
      if (joinErr) throw joinErr;

      setStep(2);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function skipOffer() {
    router.replace(`/dashboard/${city}`);
  }

  async function submitOffer() {
    if (!company.trim()) {
      setError("Add the company you're placed at, or hit Skip for now.");
      return;
    }
    if (!file) {
      setError("Attach a screenshot of your offer, or hit Skip for now.");
      return;
    }
    if (!userId || !city) return;
    setSubmitting(true);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("offer-screenshots")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("verifications").insert({
        user_id: userId,
        company_name: company.trim(),
        city,
        screenshot_path: path,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      router.replace(`/dashboard/${city}`);
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
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold text-paper">
          Join your batch's board
        </h1>
        <p className="mt-2 text-sm text-slate">
          Join instantly to chat and see who's around. Add your offer (now
          or later) and get verified to unlock posting and DMs.
        </p>

        <div className="mt-5 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-amber" : "bg-inkline"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-8 space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate">Batch year</label>
                  <input
                    type="number"
                    value={batchYear}
                    onChange={(e) => setBatchYear(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate">Branch</label>
                <input
                  placeholder="Computer Science"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
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
                  placeholder="A couple lines about you…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                />
              </div>
              {error && <p className="text-sm text-rust">{error}</p>}
              <button
                onClick={goNext}
                className="w-full rounded-full bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <div className="grid grid-cols-2 gap-3">
                {CITIES.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCity(c.slug)}
                    className="glass-card p-4 text-left transition-transform"
                    style={{
                      borderColor: city === c.slug ? c.color : undefined,
                      boxShadow: city === c.slug ? `0 0 0 2px ${c.color}55` : undefined,
                    }}
                  >
                    <span className="font-mono text-lg font-bold" style={{ color: c.color }}>
                      {c.code}
                    </span>
                    <p className="mt-1 text-xs text-paper/80">{c.name}</p>
                  </button>
                ))}
              </div>

              {error && <p className="mt-4 text-sm text-rust">{error}</p>}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-full border border-inkline px-5 py-3 text-sm text-paper/80 hover:border-amber hover:text-amber"
                >
                  Back
                </button>
                <button
                  onClick={joinCity}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
                >
                  {submitting ? "Joining…" : "Continue"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <p className="mb-4 text-sm text-slate">
                Optional right now — add it anytime later from your board.
                Once an admin verifies it, you unlock posting, DMs, and the
                full directory.
              </p>
              <div className="space-y-3">
                <input
                  placeholder="Company, e.g. Microsoft"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                />
                <div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-slate file:mr-3 file:rounded-full file:border-0 file:bg-inkline file:px-3 file:py-1.5 file:text-paper/80"
                  />
                  <p className="mt-1 text-[11px] text-slate/70">
                    Private — only your admin sees it, no one sees your package/CTC.
                  </p>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-rust">{error}</p>}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={skipOffer}
                  className="rounded-full border border-inkline px-5 py-3 text-sm text-paper/80 hover:border-amber hover:text-amber"
                >
                  Skip for now
                </button>
                <button
                  onClick={submitOffer}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit for verification"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </main>
  );
}
