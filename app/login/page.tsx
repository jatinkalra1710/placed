"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "redirecting">("idle");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "domain") {
      setError(
        "That Google account isn't on the thapar.edu domain. Sign in with your college Google account instead."
      );
    }
  }, []);

  async function signInWithGoogle() {
    setStatus("redirecting");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // hd hints Google to only show thapar.edu accounts in the picker.
        // It's a hint, not an enforced rule, so the database trigger is
        // the real gate — this just makes the UI nicer.
        queryParams: {
          hd: "thapar.edu",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-md px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Boarding pass check-in
        </p>
        <h1 className="mt-3 font-mono text-2xl font-bold text-paper">
          Sign in with your Thapar Google account
        </h1>
        <p className="mt-3 text-sm text-slate">
          Your @thapar.edu email runs on Google, so sign in the same way you
          check your college mail.
        </p>

        {error && (
          <p className="mt-6 rounded border border-rust/40 bg-rust/10 p-3 text-sm text-rust">
            {error}
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={status === "redirecting"}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded bg-paper px-5 py-3 font-semibold text-ink hover:bg-paper/90 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>
          {status === "redirecting" ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="mt-4 text-center text-xs text-slate">
          Only @thapar.edu accounts can access this community.
        </p>
      </section>
    </main>
  );
}
