"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageCircle, ShieldCheck, LifeBuoy, LucideIcon } from "lucide-react";

interface TabDef {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function MobileTabBar({
  isAdmin,
  unreadCount,
  adminAlerts = 0,
}: {
  isAdmin: boolean;
  unreadCount: number;
  adminAlerts?: number;
}) {
  const pathname = usePathname();

  const tabs: TabDef[] = [
    { href: "/dashboard", label: "Board", icon: Home },
    { href: "/directory", label: "Find", icon: Users },
    { href: "/messages", label: "Chats", icon: MessageCircle },
    { href: "/support", label: "Help", icon: LifeBuoy },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav
      className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full px-2 py-2 sm:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((t) => {
        const active = pathname?.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-col items-center gap-0.5 rounded-full px-3.5 py-1.5 text-[10px] transition-colors ${
              active ? "bg-amber text-ink" : "text-slate"
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            {t.href === "/messages" && unreadCount > 0 && (
              <span className="absolute right-1.5 top-0.5 h-2 w-2 rounded-full bg-rust ring-2 ring-[rgb(var(--color-ink))]" />
            )}
            {t.href === "/admin" && adminAlerts > 0 && (
              <span className="absolute right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rust font-mono text-[8px] text-white ring-2 ring-[rgb(var(--color-ink))]">
                {adminAlerts > 9 ? "9+" : adminAlerts}
              </span>
            )}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
