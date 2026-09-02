"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";

export default function ThreadPage({
  params,
}: {
  params: { userId: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [myId, setMyId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setMyId(userData.user.id);

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", params.userId)
        .maybeSingle();
      setOtherName(otherProfile?.full_name || "Batchmate");

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, body, created_at")
        .or(
          `and(sender_id.eq.${userData.user.id},receiver_id.eq.${params.userId}),and(sender_id.eq.${params.userId},receiver_id.eq.${userData.user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, router, params.userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !myId) return;
    setSending(true);
    setError("");
    const { data, error: sendErr } = await supabase
      .from("messages")
      .insert({ sender_id: myId, receiver_id: params.userId, body: body.trim() })
      .select("id, sender_id, receiver_id, body, created_at")
      .single();
    setSending(false);
    if (sendErr) {
      setError(
        "Couldn't send — you can only message batchmates who are also verified."
      );
      return;
    }
    if (data) setMessages((prev) => [...prev, data]);
    setBody("");
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center font-mono text-sm text-slate">
          Loading conversation…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
        <a href="/messages" className="text-xs text-slate hover:text-amber">
          ← All messages
        </a>
        <h1 className="mt-2 font-mono text-xl font-bold text-paper">
          {otherName}
        </h1>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-slate">
              Say hi — this is the start of your conversation.
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.sender_id === myId;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "bg-amber text-ink"
                      : "border border-inkline text-paper/90"
                  }`}
                >
                  {m.body}
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p className="mt-2 text-sm text-rust">{error}</p>}

        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded glass-input px-4 py-2.5 text-sm text-paper outline-none focus:border-amber"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
