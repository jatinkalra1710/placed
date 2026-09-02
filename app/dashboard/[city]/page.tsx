"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import MemberCard, { CityMemberRow } from "@/components/MemberCard";
import PostCard, { BoardPostRow } from "@/components/PostCard";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { createClient } from "@/lib/supabase/client";
import { cityBySlug } from "@/lib/cities";
import { BATCH_LABEL } from "@/lib/config";
import { PostType } from "@/lib/types";

export default function CityBoardPage({
  params,
}: {
  params: { city: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const cityMeta = cityBySlug(params.city);

  const [tab, setTab] = useState<"directory" | "board">("directory");
  const [members, setMembers] = useState<CityMemberRow[]>([]);
  const [posts, setPosts] = useState<BoardPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [myName, setMyName] = useState("");
  const [myCompany, setMyCompany] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [memberQuery, setMemberQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState<PostType>("flat");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userData.user.id)
        .single();
      setMyName(myProfile?.full_name || "");

      const { data: myVerification } = await supabase
        .from("verifications")
        .select("status, city, company_name")
        .eq("user_id", userData.user.id)
        .eq("status", "approved")
        .eq("city", params.city)
        .maybeSingle();

      if (!myVerification) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      setMyCompany(myVerification.company_name || "");

      const [{ data: memberRows }, { data: postRows }] = await Promise.all([
        supabase
          .from("city_members")
          .select("user_id, full_name, branch, batch_year, company_name")
          .eq("city", params.city),
        supabase
          .from("posts")
          .select(
            "id, type, title, description, contact_info, tags, created_at, user_id, profiles(full_name)"
          )
          .eq("city", params.city)
          .order("created_at", { ascending: false }),
      ]);

      setMembers((memberRows as CityMemberRow[]) ?? []);
      setPosts(
        (postRows ?? []).map((p: any) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          description: p.description,
          contact_info: p.contact_info,
          tags: p.tags ?? [],
          created_at: p.created_at,
          posted_by: p.profiles?.full_name ?? "a batchmate",
          user_id: p.user_id,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase, router, params.city]);

  const filteredMembers = useMemo(() => {
    if (!memberQuery.trim()) return members;
    const q = memberQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.company_name.toLowerCase().includes(q)
    );
  }, [members, memberQuery]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!tagFilter) return posts;
    return posts.filter((p) => p.tags.includes(tagFilter));
  }, [posts, tagFilter]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!title.trim() || !description.trim() || !contact.trim()) {
      setFormError("Fill in every field before posting.");
      return;
    }
    setPosting(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean)
      .slice(0, 6);

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userData.user.id,
        city: params.city,
        type: postType,
        title,
        description,
        contact_info: contact,
        tags,
      })
      .select("id, type, title, description, contact_info, tags, created_at")
      .single();

    setPosting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (data) {
      setPosts((prev) => [
        { ...data, posted_by: "you", user_id: userData.user!.id } as BoardPostRow,
        ...prev,
      ]);
    }
    setTitle("");
    setDescription("");
    setContact("");
    setTagsInput("");
    setShowForm(false);
  }

  if (!cityMeta) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center text-slate">
          Unknown city group.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <p className="mx-auto max-w-lg px-5 py-20 text-center font-mono text-sm text-slate">
          Loading {cityMeta.code}…
        </p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-widest2 text-rust">
            No access
          </p>
          <h1 className="mt-3 font-mono text-xl font-bold text-paper">
            You're not verified for {cityMeta.name}
          </h1>
          <p className="mt-2 text-sm text-slate">
            Head back to your dashboard to check your verification status.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded bg-amber px-5 py-3 font-semibold text-ink hover:bg-amber/90"
          >
            Go to dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <WelcomeOverlay name={myName} company={myCompany} cityName={cityMeta.name} />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
            Welcome, {myName || "batchmate"} · {BATCH_LABEL}
          </p>
          <h1 className="mt-2 font-mono text-3xl font-bold text-paper">
            Gate {cityMeta.code} — {cityMeta.name}
          </h1>
          <p className="mt-1 text-sm text-slate">
            {members.length} batchmate{members.length === 1 ? "" : "s"} verified for this city.{" "}
            <a href="/directory" className="text-amber hover:underline">
              Search the whole batch instead →
            </a>
          </p>
        </motion.div>

        <div className="mt-6 flex gap-2 border-b border-inkline">
          <button
            onClick={() => setTab("directory")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "directory" ? "border-b-2 border-amber text-amber" : "text-slate"}`}
          >
            Directory
          </button>
          <button
            onClick={() => setTab("board")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "board" ? "border-b-2 border-amber text-amber" : "text-slate"}`}
          >
            Flat &amp; roommate board
          </button>
        </div>

        {tab === "directory" && (
          <div className="mt-6">
            <input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search by name or company…"
              className="mb-4 w-full rounded glass-input px-4 py-2.5 text-sm text-paper outline-none focus:border-amber"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredMembers.length === 0 && (
                <p className="text-sm text-slate">
                  {members.length === 0
                    ? "No one else has been verified for this city yet — you're the first."
                    : "No matches."}
                </p>
              )}
              <AnimatePresence>
                {filteredMembers.map((m, i) => (
                  <motion.div
                    key={m.user_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <MemberCard member={m} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {tab === "board" && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${!tagFilter ? "border-amber text-amber" : "border-inkline text-slate"}`}
                >
                  All
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(t)}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${tagFilter === t ? "border-amber text-amber" : "border-inkline text-slate"}`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowForm((s) => !s)}
                className="rounded bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90"
              >
                {showForm ? "Cancel" : "+ New post"}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={submitPost}
                  className="mt-4 space-y-3 overflow-hidden glass-card p-5"
                >
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as PostType)}
                    className="rounded glass-input px-3 py-2 text-sm text-paper outline-none focus:border-amber"
                  >
                    <option value="flat">Looking for a flat</option>
                    <option value="roommate">Looking for a roommate</option>
                    <option value="pg">Looking for a PG</option>
                  </select>
                  <input
                    placeholder="Title, e.g. 2BHK near Cyber Hub, need 1 flatmate"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
                  />
                  <textarea
                    placeholder="Budget, area, move-in date, anything relevant…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
                  />
                  <input
                    placeholder="Phone / WhatsApp / email to contact you on"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
                  />
                  <input
                    placeholder="Tags, comma separated — e.g. sector-49, girls-only, near-metro"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full rounded glass-input px-3 py-2.5 text-sm text-paper outline-none focus:border-amber"
                  />
                  {formError && <p className="text-sm text-rust">{formError}</p>}
                  <button
                    type="submit"
                    disabled={posting}
                    className="rounded bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
                  >
                    {posting ? "Posting…" : "Post to board"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {filteredPosts.length === 0 && (
                <p className="text-sm text-slate">
                  No posts yet. Be the first to look for a flat, PG or roommate.
                </p>
              )}
              <AnimatePresence>
                {filteredPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    currentUserId={userId}
                    onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
