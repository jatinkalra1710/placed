"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PostType } from "@/lib/types";

const TYPE_LABEL: Record<PostType, string> = {
  roommate: "Roommate",
  flat: "Flat",
  pg: "PG",
};

const TYPE_COLOR: Record<PostType, string> = {
  roommate: "text-amber border-amber/50",
  flat: "text-signal border-signal/50",
  pg: "text-rust border-rust/50",
};

export interface BoardPostRow {
  id: string;
  type: PostType;
  title: string;
  description: string;
  contact_info: string;
  tags: string[];
  created_at: string;
  posted_by: string;
  user_id: string;
}

interface ReplyRow {
  id: string;
  body: string;
  is_public: boolean;
  created_at: string;
  author: string;
}

export default function PostCard({
  post,
  currentUserId,
  onDeleted,
}: {
  post: BoardPostRow;
  currentUserId: string | null;
  onDeleted?: (id: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isOwner = currentUserId === post.user_id;

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<"public" | "private">("public");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const date = new Date(post.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  async function toggleReplies() {
    const next = !showReplies;
    setShowReplies(next);
    if (next && replies.length === 0) {
      setLoadingReplies(true);
      const { data } = await supabase
        .from("post_replies")
        .select("id, body, is_public, created_at, profiles(full_name)")
        .eq("post_id", post.id)
        .eq("is_public", true)
        .order("created_at", { ascending: true });
      setReplies(
        (data ?? []).map((r: any) => ({
          id: r.id,
          body: r.body,
          is_public: r.is_public,
          created_at: r.created_at,
          author: r.profiles?.full_name ?? "a batchmate",
        }))
      );
      setLoadingReplies(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !currentUserId) return;
    setSending(true);

    if (replyMode === "private") {
      await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: post.user_id,
        body: `Re: "${post.title}" — ${replyText.trim()}`,
      });
      setSending(false);
      setReplyText("");
      router.push(`/messages/${post.user_id}`);
      return;
    }

    const { data } = await supabase
      .from("post_replies")
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        body: replyText.trim(),
        is_public: true,
      })
      .select("id, body, is_public, created_at")
      .single();

    if (data) {
      setReplies((prev) => [...prev, { ...data, author: "you" }]);
    }
    setReplyText("");
    setSending(false);
  }

  async function deletePost() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setDeleting(false);
    if (!error) onDeleted?.(post.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${TYPE_COLOR[post.type]}`}
        >
          {TYPE_LABEL[post.type]}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate">{date}</span>
          {isOwner && (
            <button
              onClick={deletePost}
              disabled={deleting}
              className="text-[11px] text-slate hover:text-rust disabled:opacity-50"
              title="Delete post"
            >
              {deleting ? "…" : "Delete"}
            </button>
          )}
        </div>
      </div>
      <h3 className="mt-3 font-semibold text-paper">{post.title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate">
        {post.description}
      </p>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-inkline px-2 py-0.5 font-mono text-[10px] text-slate"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 rounded border border-inkline bg-ink px-3 py-2">
        <p className="font-mono text-xs text-amber">{post.contact_info}</p>
      </div>
      <p className="mt-2 text-[11px] text-slate">Posted by {post.posted_by}</p>

      <button
        onClick={toggleReplies}
        className="mt-3 text-xs font-medium text-amber hover:underline"
      >
        {showReplies ? "Hide replies" : "Reply"}
      </button>

      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-inkline pt-3">
              {loadingReplies && (
                <p className="text-xs text-slate">Loading replies…</p>
              )}
              {!loadingReplies && replies.length === 0 && (
                <p className="text-xs text-slate">No public replies yet.</p>
              )}
              {replies.map((r) => (
                <div key={r.id} className="rounded bg-inkline/30 px-3 py-2">
                  <p className="text-sm text-paper/90">{r.body}</p>
                  <p className="mt-1 text-[10px] text-slate">— {r.author}</p>
                </div>
              ))}

              {currentUserId && (
                <form onSubmit={sendReply} className="mt-2 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      replyMode === "public"
                        ? "Reply publicly on this post…"
                        : "Send a private note to the poster…"
                    }
                    rows={2}
                    className="w-full rounded glass-input px-3 py-2 text-sm text-paper outline-none focus:border-amber"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex rounded border border-inkline p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setReplyMode("public")}
                        className={`rounded px-2 py-1 ${replyMode === "public" ? "bg-amber text-ink" : "text-slate"}`}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode("private")}
                        className={`rounded px-2 py-1 ${replyMode === "private" ? "bg-amber text-ink" : "text-slate"}`}
                      >
                        Private
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="rounded bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
                    >
                      {sending ? "Sending…" : replyMode === "public" ? "Post reply" : "Send privately"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
