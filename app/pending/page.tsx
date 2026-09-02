"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"pending" | "rejected" | "loading">(
    "loading"
  );
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("verifications")
        .select("status, review_note")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (!data) {
        router.replace("/onboarding");
        return;
      }
      if (data.status === "approved") {
        router.replace("/dashboard");
        return;
      }
      setStatus(data.status === "rejected" ? "rejected" : "pending");
      setNote(data.review_note);
    }

    check();
    const interval = setInterval(check, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [supabase, router]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-lg px-5 py-24 text-center">
        {status === "pending" && (
          <>
            <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
              Boarding pending
            </p>
            <h1 className="mt-3 font-mono text-2xl font-bold text-paper">
              Your offer is being verified
            </h1>
            <p className="mt-3 text-sm text-slate">
              An admin checks screenshots by hand, so this can take a bit.
              This page refreshes itself — no need to keep checking.
            </p>
          </>
        )}
        {status === "rejected" && (
          <>
            <p className="font-mono text-xs uppercase tracking-widest2 text-rust">
              Not verified
            </p>
            <h1 className="mt-3 font-mono text-2xl font-bold text-paper">
              We couldn't verify that submission
            </h1>
            {note && <p className="mt-3 text-sm text-slate">{note}</p>}
            <a
              href="/onboarding"
              className="mt-6 inline-block rounded bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90"
            >
              Submit again
            </a>
          </>
        )}
      </section>
    </main>
  );
}
