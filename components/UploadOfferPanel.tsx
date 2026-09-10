"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CitySlug } from "@/lib/cities";

export default function UploadOfferPanel({
  userId,
  city,
  onSubmitted,
}: {
  userId: string;
  city: CitySlug;
  onSubmitted: () => void;
}) {
  const supabase = createClient();
  const [company, setCompany] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) {
      setError("Add the company you're placed at.");
      return;
    }
    if (!file) {
      setError("Attach a screenshot of your accepted offer — required so an admin can verify it.");
      return;
    }
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

      onSubmitted();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber/15 text-amber">
        <ShieldCheck size={18} />
      </div>
      <h3 className="mt-3 font-semibold text-paper">Unlock full access</h3>
      <p className="mt-1 text-sm text-slate">
        Add your company and a screenshot of your offer. Once an admin
        verifies it, you'll unlock posting, DMs, and the full directory —
        this keeps the badge meaning something.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
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
            Required — private, admin-only, no one sees your package/CTC.
          </p>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for verification"}
        </button>
      </form>
    </motion.div>
  );
}
