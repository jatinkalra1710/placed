import Link from "next/link";
import { UserCheck, ShieldCheck, Users2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CITIES } from "@/lib/cities";
import RevealSection from "@/components/RevealSection";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <RevealSection className="mx-auto max-w-5xl px-5 pb-10 pt-16 sm:pt-24">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Restricted to @thapar.edu
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.15] text-paper sm:text-6xl">
          Placed. Now <span className="gradient-text">boarding</span> for
          your city.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate sm:text-lg">
          Verify your offer letter once. Get access to everyone from your
          batch relocating to the same city — see who's going where, and sort
          your flat, PG or roommate before you land.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-amber px-6 py-3 font-semibold text-ink shadow-lg shadow-amber/20 transition-transform hover:scale-[1.03] hover:bg-amber/90"
          >
            Get boarding access
          </Link>
          <Link
            href="#board"
            className="rounded-full border border-inkline px-6 py-3 text-paper/80 transition-colors hover:border-amber hover:text-amber"
          >
            See the cities
          </Link>
        </div>
      </RevealSection>

      {/* Departure board — each city gets its own accent color */}
      <RevealSection id="board" className="mx-auto max-w-5xl px-5 pb-24">
        <div className="glass-card overflow-hidden !rounded-2xl">
          <div className="grid grid-cols-12 gap-2 border-b border-inkline/60 px-5 py-3 font-mono text-[11px] uppercase tracking-widest2 text-slate">
            <span className="col-span-2">Code</span>
            <span className="col-span-6">City group</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2 text-right">Gate</span>
          </div>
          {CITIES.map((city, i) => (
            <div
              key={city.slug}
              className="flap-in grid grid-cols-12 items-center gap-2 border-b border-inkline/40 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className="col-span-2 font-mono text-lg font-bold"
                style={{ color: city.color }}
              >
                {city.code}
              </span>
              <span className="col-span-6 text-paper/90">{city.name}</span>
              <span className="col-span-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                  style={{ borderColor: `${city.color}80`, color: city.color }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: city.color }}
                  />
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
      </RevealSection>

      {/* How it works */}
      <RevealSection className="mx-auto max-w-5xl px-5 pb-24">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-amber">
          How it works
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: UserCheck,
              title: "Sign in with @thapar.edu",
              body: "One tap with your college Google account. No passwords.",
              color: "#E8A33D",
            },
            {
              icon: Users2,
              title: "Join your city, instantly",
              body: "Chat and see who else is around the moment you pick a city — no waiting.",
              color: "#06B6D4",
            },
            {
              icon: ShieldCheck,
              title: "Add your offer, unlock everything",
              body: "Post on the board, DM anyone, see the full directory — the moment you add it.",
              color: "#8B5CF6",
            },
          ].map((s) => (
            <div key={s.title} className="glass-card p-6">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${s.color}1f`, color: s.color }}
              >
                <s.icon size={20} strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-semibold text-paper">{s.title}</h3>
              <p className="mt-1 text-sm text-slate">{s.body}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      <footer className="border-t border-inkline px-5 py-6 text-center text-xs text-slate">
        Built by and for the Thapar batch. Not affiliated with TIET
        administration.
      </footer>
    </main>
  );
}
