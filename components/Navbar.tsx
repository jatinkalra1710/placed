"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const links = [
    { href: "/dashboard", label: "Board" },
    { href: "/directory", label: "Find people" },
    { href: "/messages", label: "Messages" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass sticky top-0 z-30 border-x-0 border-t-0"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="hidden text-sm text-slate sm:inline">
            Thapar Placed
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {email &&
            links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hidden transition-colors sm:inline ${
                  pathname?.startsWith(l.href)
                    ? "text-amber"
                    : "text-paper/70 hover:text-amber"
                }`}
              >
                {l.label}
              </Link>
            ))}
          {email && (
            <Link
              href="/profile"
              className="hidden font-mono text-xs text-slate hover:text-amber sm:inline"
            >
              {email}
            </Link>
          )}
          <ThemeToggle />
          {email && (
            <button
              onClick={signOut}
              className="rounded border border-inkline px-3 py-1.5 text-paper/80 transition-colors hover:border-rust hover:text-rust"
            >
              Sign out
            </button>
          )}
          {!email && (
            <Link
              href="/login"
              className="rounded border border-amber px-3 py-1.5 font-medium text-amber transition-colors hover:bg-amber hover:text-ink"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
      {email && (
        <div className="flex gap-4 overflow-x-auto border-t border-inkline/60 px-5 py-2 text-xs sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap ${
                pathname?.startsWith(l.href) ? "text-amber" : "text-slate"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </motion.header>
  );
}
