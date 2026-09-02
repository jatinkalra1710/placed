"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

interface Conversation {
  otherUserId: string;
  otherName: string;
  lastMessage: string;
  lastAt: string;
}

export default function MessagesListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const myId = userData.user.id;

      const { data } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, body, created_at")
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order("created_at", { ascending: false });

      const byOther = new Map<string, Conversation>();
      for (const m of data ?? []) {
        const otherId = m.sender_id === myId ? m.receiver_id : m.sender_id;
        if (!byOther.has(otherId)) {
          byOther.set(otherId, {
            otherUserId: otherId,
            otherName: otherId,
            lastMessage: m.body,
            lastAt: m.created_at,
          });
        }
      }

      const otherIds = Array.from(byOther.keys());
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", otherIds);
        for (const p of profiles ?? []) {
          const conv = byOther.get(p.id);
          if (conv) conv.otherName = p.full_name || "Batchmate";
        }
      }

      setConversations(Array.from(byOther.values()));
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
          Direct messages
        </p>
        <h1 className="mt-2 font-mono text-2xl font-bold text-paper">
          Messages
        </h1>

        {loading && (
          <p className="mt-6 text-sm text-slate">Loading conversations…</p>
        )}

        {!loading && conversations.length === 0 && (
          <p className="mt-6 text-sm text-slate">
            No conversations yet.{" "}
            <a href="/directory" className="text-amber hover:underline">
              Find someone to message →
            </a>
          </p>
        )}

        <div className="mt-6 space-y-2">
          {conversations.map((c, i) => (
            <motion.a
              key={c.otherUserId}
              href={`/messages/${c.otherUserId}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="block glass-card p-4 transition-colors hover:border-amber/40"
            >
              <p className="font-medium text-paper">{c.otherName}</p>
              <p className="mt-0.5 truncate text-sm text-slate">
                {c.lastMessage}
              </p>
            </motion.a>
          ))}
        </div>
      </section>
    </main>
  );
}
