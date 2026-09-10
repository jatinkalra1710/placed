"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * For admins only: counts pending verifications + open support tickets
 * needing attention, live via Realtime. Returns 0 (and does nothing)
 * for non-admins.
 */
export function useAdminAlerts(isAdmin: boolean) {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      setCount(0);
      return;
    }

    let active = true;

    async function fetchCount() {
      const [{ count: pending }, { count: tickets }] = await Promise.all([
        supabase.from("verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      if (active) setCount((pending ?? 0) + (tickets ?? 0));
    }
    fetchCount();

    const channel = supabase
      .channel("admin_alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "verifications" }, fetchCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, fetchCount)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, isAdmin]);

  return count;
}
