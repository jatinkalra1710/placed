"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CitySlug } from "@/lib/cities";

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${date}, ${time}`;
}

export default function ChatRoom({
  city,
  myId,
  myName,
}: {
  city: CitySlug;
  myId: string;
  myName: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [undoableId, setUndoableId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<Map<string, string>>(new Map());
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("city_chat_messages")
        .select("id, user_id, body, created_at, profiles(full_name)")
        .eq("city", city)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!active) return;
      const rows = (data ?? []).map((m: any) => {
        namesRef.current.set(m.user_id, m.profiles?.full_name ?? "Batchmate");
        return {
          id: m.id,
          user_id: m.user_id,
          body: m.body,
          created_at: m.created_at,
          author: m.profiles?.full_name ?? "Batchmate",
        };
      });
      setMessages(rows);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`city_chat:${city}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "city_chat_messages", filter: `city=eq.${city}` },
        async (payload) => {
          const m = payload.new as any;
          if (m.user_id === myId) return; // we already appended our own optimistically

          let author = namesRef.current.get(m.user_id);
          if (!author) {
            const { data: p } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", m.user_id)
              .maybeSingle();
            author = (p?.full_name || "Batchmate") as string;
            namesRef.current.set(m.user_id, author);
          }

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, { id: m.id, user_id: m.user_id, body: m.body, created_at: m.created_at, author }];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "city_chat_messages", filter: `city=eq.${city}` },
        (payload) => {
          setMessages((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, city, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body.trim();
    setBody("");
    namesRef.current.set(myId, myName);

    const { data } = await supabase
      .from("city_chat_messages")
      .insert({ city, user_id: myId, body: text })
      .select("id, created_at")
      .single();

    if (data) {
      setMessages((prev) => [
        ...prev,
        { id: data.id, user_id: myId, body: text, created_at: data.created_at, author: myName },
      ]);
      setUndoableId(data.id);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoableId(null), 10000);
    }
  }

  async function undoSend(id: string) {
    setUndoableId(null);
    setMessages((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("city_chat_messages").delete().eq("id", id);
  }

  return (
    <div className="glass-card flex h-[28rem] flex-col p-4">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {loading && <p className="text-xs text-slate">Loading chat…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-slate">
            No messages yet — say hi to your city group.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.user_id === myId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.2) }}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <span className="mb-0.5 px-1 text-[10px] text-slate">
                  {mine ? "You" : m.author}
                </span>
                <div
                  className={`rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-amber text-ink" : "border border-inkline text-paper/90"
                  }`}
                >
                  {m.body}
                </div>
                <div className="mt-0.5 flex items-center gap-2 px-1">
                  <span className="font-mono text-[10px] text-slate">
                    {formatDateTime(m.created_at)}
                  </span>
                  <AnimatePresence>
                    {mine && undoableId === m.id && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => undoSend(m.id)}
                        className="flex items-center gap-0.5 rounded-full bg-rust/15 px-2 py-0.5 text-[10px] font-medium text-rust hover:bg-rust/25"
                      >
                        <Undo2 size={10} /> Undo
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message your city group…"
          className="glass-input flex-1 rounded-full px-4 py-2 text-sm text-paper outline-none"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
