import Link from "next/link";
import Navbar from "@/components/Navbar";
import { CITIES } from "@/lib/cities";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-5xl px-5 pb-10 pt-16">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Restricted to @thapar.edu
        </p>
        <h1 className="mt-4 max-w-2xl font-mono text-4xl font-bold leading-tight text-paper sm:text-5xl">
          Placed. Now boarding for your city.
        </h1>
        <p className="mt-5 max-w-xl text-base text-slate">
          Verify your offer letter once. Get access to everyone from your
          batch relocating to the same city — see who's going where, and sort
          your flat, PG or roommate before you land.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="rounded bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90"
          >
            Get boarding access
          </Link>
          <Link
            href="#board"
            className="rounded border border-inkline px-5 py-3 text-paper/80 hover:border-amber hover:text-amber"
          >
            See the cities
          </Link>
        </div>
      </section>

      {/* Departure board */}
      <section id="board" className="mx-auto max-w-5xl px-5 pb-24">
        <div className="glass overflow-hidden rounded-lg">
          <div className="grid grid-cols-12 gap-2 border-b border-inkline px-5 py-3 font-mono text-[11px] uppercase tracking-widest2 text-slate">
            <span className="col-span-2">Code</span>
            <span className="col-span-6">City group</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2 text-right">Gate</span>
          </div>
          {CITIES.map((city, i) => (
            <div
              key={city.slug}
              className="flap-in grid grid-cols-12 items-center gap-2 border-b border-inkline/60 px-5 py-4 last:border-b-0 hover:bg-ink/40"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="col-span-2 font-mono text-lg font-bold text-amber">
                {city.code}
              </span>
              <span className="col-span-6 text-paper/90">{city.name}</span>
              <span className="col-span-2">
                <span className="rounded-full border border-signal/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-signal">
                  Open
                </span>
              </span>
              <span className="col-span-2 text-right font-mono text-xs text-slate">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate">
          A city group unlocks once your offer screenshot is verified by an
          admin. You'll only see fellow students headed to the same city.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-amber">
          How boarding works
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Sign in with @thapar.edu",
              body: "One-time code sent to your college email. No passwords.",
            },
            {
              step: "02",
              title: "Upload your offer screenshot",
              body: "Company name, city, and a screenshot of your accepted offer.",
            },
            {
              step: "03",
              title: "Admin verifies, you board",
              body: "Once approved you unlock your city's directory and board.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="glass-card p-5"
            >
              <span className="font-mono text-2xl font-bold text-amber/70">
                {s.step}
              </span>
              <h3 className="mt-2 font-semibold text-paper">{s.title}</h3>
              <p className="mt-1 text-sm text-slate">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-inkline px-5 py-6 text-center text-xs text-slate">
        Built by and for the Thapar batch. Not affiliated with TIET
        administration.
      </footer>
    </main>
  );
}
