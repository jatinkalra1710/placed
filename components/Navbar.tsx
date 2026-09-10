"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import MobileTabBar from "./MobileTabBar";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { useAdminAlerts } from "@/lib/hooks/useAdminAlerts";

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [primaryCity, setPrimaryCity] = useState<string | null>(null);
  const supabase = createClient();
  const unread = useUnreadMessages(userId, pathname ?? undefined);
  const adminAlerts = useAdminAlerts(isAdmin);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      if (!data.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      setIsAdmin(profile?.role === "admin");

      const { data: membership } = await supabase
        .from("city_memberships")
        .select("city")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membership) {
        setPrimaryCity(membership.city);
        const { data: offer } = await supabase
          .from("verifications")
          .select("status, screenshot_path")
          .eq("user_id", data.user.id)
          .eq("city", membership.city)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const trulyUnlocked = offer?.status === "approved" && !!offer?.screenshot_path;
        setNeedsUnlock(!trulyUnlocked);
      }
    });
  }, [supabase, pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const links: { href: string; label: string; badge?: number }[] = [
    { href: "/dashboard", label: "Board" },
    { href: "/directory", label: "Find people" },
    { href: "/messages", label: "Messages" },
    { href: "/support", label: "Support" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", badge: adminAlerts }] : []),
  ];

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-3 z-30 mx-auto max-w-5xl px-3 sm:top-4 sm:px-5"
      >
        <div className="glass flex items-center justify-between rounded-full px-4 py-2.5 sm:px-6 sm:py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={30} />
            <span className="hidden text-sm font-medium text-slate sm:inline">
              TIET 2027 Community
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {email &&
              links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative hidden transition-colors sm:inline ${
                    pathname?.startsWith(l.href)
                      ? "text-amber"
                      : "text-paper/70 hover:text-amber"
                  }`}
                >
                  {l.label}
                  {l.href === "/messages" && unread > 0 && (
                    <span className="absolute -right-2.5 -top-1 flex h-2 w-2 items-center justify-center rounded-full bg-rust" />
                  )}
                  {l.badge !== undefined && l.badge > 0 && (
                    <span className="absolute -right-3 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rust font-mono text-[9px] text-white">
                      {l.badge > 9 ? "9+" : l.badge}
                    </span>
                  )}
                </Link>
              ))}

            {email && needsUnlock && primaryCity && (
              <Link
                href={`/dashboard/${primaryCity}?tab=board`}
                className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-amber to-rust px-3 py-1.5 text-xs font-semibold text-ink shadow-sm sm:flex"
                title="Upload your offer to unlock full access"
              >
                <Sparkles size={13} /> Unlock
              </Link>
            )}

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
                className="rounded-full border border-inkline px-3 py-1.5 text-paper/80 transition-colors hover:border-rust hover:text-rust"
              >
                Sign out
              </button>
            )}
            {!email && (
              <Link
                href="/login"
                className="rounded-full bg-amber px-4 py-1.5 font-medium text-ink transition-transform hover:scale-105"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>

        {email && needsUnlock && primaryCity && (
          <Link
            href={`/dashboard/${primaryCity}?tab=board`}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber to-rust px-3 py-1.5 text-xs font-semibold text-ink shadow-sm sm:hidden"
          >
            <Sparkles size={13} /> Upload your offer to unlock full access
          </Link>
        )}
      </motion.header>

      {email && <MobileTabBar isAdmin={isAdmin} unreadCount={unread} adminAlerts={adminAlerts} />}
    </>
  );
}
