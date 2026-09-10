"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tracks how many unread DMs the current user has, live. Re-fetches
 * whenever `refreshKey` changes (pass a pathname so it re-checks on
 * navigation, e.g. after visiting a thread that marks messages read),
 * and stays live in between via a Realtime subscription on new inserts.
 */
export function useUnreadMessages(userId: string | null, refreshKey?: string) {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    let active = true;

    async function fetchCount() {
      const { count: c } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .is("read_at", null);
      if (active) setCount(c ?? 0);
    }
    fetchCount();

    const channel = supabase
      .channel(`unread_dm:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => fetchCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refreshKey]);

  return count;
}
