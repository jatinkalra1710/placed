"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import MemberCard, { CityMemberRow } from "@/components/MemberCard";
import PostCard, { BoardPostRow } from "@/components/PostCard";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import ChatRoom from "@/components/ChatRoom";
import UploadOfferPanel from "@/components/UploadOfferPanel";
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
  const searchParams = useSearchParams();
  const supabase = createClient();
  const cityMeta = cityBySlug(params.city);

  const [tab, setTab] = useState<"directory" | "board" | "chat">("chat");
  const [members, setMembers] = useState<CityMemberRow[]>([]);
  const [namesOnly, setNamesOnly] = useState<{ user_id: string; full_name: string }[]>([]);
  const [posts, setPosts] = useState<BoardPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
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

  async function loadDirectory(uid: string, hasOffer: boolean) {
    if (hasOffer) {
      const { data: memberRows } = await supabase
        .from("city_members")
        .select("user_id, full_name, branch, batch_year, company_name")
        .eq("city", params.city);
      setMembers((memberRows as CityMemberRow[]) ?? []);
    } else {
      const { data: nameRows } = await supabase
        .from("city_memberships")
        .select("user_id, profiles(full_name)")
        .eq("city", params.city);
      setNamesOnly(
        (nameRows ?? []).map((r: any) => ({
          user_id: r.user_id,
          full_name: r.profiles?.full_name ?? "Batchmate",
        }))
      );
    }
  }

  async function loadPosts() {
    const { data: postRows } = await supabase
      .from("posts")
      .select(
        "id, type, title, description, contact_info, tags, created_at, user_id, profiles(full_name)"
      )
      .eq("city", params.city)
      .order("created_at", { ascending: false });

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
  }

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

      const { data: membership } = await supabase
        .from("city_memberships")
        .select("city")
        .eq("user_id", userData.user.id)
        .eq("city", params.city)
        .maybeSingle();

      if (!membership) {
        router.replace("/onboarding");
        return;
      }
      setIsMember(true);

      const { data: myVerification } = await supabase
        .from("verifications")
        .select("company_name, status, screenshot_path, review_note")
        .eq("user_id", userData.user.id)
        .eq("city", params.city)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const trulyUnlocked =
        myVerification?.status === "approved" && !!myVerification?.screenshot_path;
      setUnlocked(trulyUnlocked);
      setVerificationStatus(myVerification?.status ?? null);
      setReviewNote(myVerification?.review_note ?? null);
      setMyCompany(myVerification?.company_name || "");
      const requestedTab = searchParams.get("tab");
      if (requestedTab === "board" || requestedTab === "directory" || requestedTab === "chat") {
        setTab(requestedTab);
      } else {
        setTab(trulyUnlocked ? "directory" : "chat");
      }

      await loadDirectory(userData.user.id, trulyUnlocked);
      if (trulyUnlocked) await loadPosts();

      setLoading(false);
    }
    load();
  }, [supabase, router, params.city]);

  const filteredMembers = useMemo(() => {
    if (!memberQuery.trim()) return members;
    const q = memberQuery.toLowerCase();
    return members.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.company_name.toLowerCase().includes(q)
    );
  }, [members, memberQuery]);

  const filteredNames = useMemo(() => {
    if (!memberQuery.trim()) return namesOnly;
    const q = memberQuery.toLowerCase();
    return namesOnly.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [namesOnly, memberQuery]);

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
        <p className="mx-auto max-w-lg px-5 py-20 text-center text-slate">Unknown city group.</p>
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

  return (
    <main className="min-h-screen">
      <Navbar />
      <WelcomeOverlay name={myName} company={myCompany} cityName={cityMeta.name} cityColor={cityMeta.color} />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
            Welcome, {myName || "batchmate"} · {BATCH_LABEL}
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold text-paper">
            <span className="rounded-lg px-2.5 py-1 text-2xl" style={{ color: cityMeta.color, backgroundColor: `${cityMeta.color}1a` }}>
              {cityMeta.code}
            </span>
            {cityMeta.name}
          </h1>
          {!unlocked && verificationStatus === "pending" && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber">
              <Lock size={13} /> Restricted access — your offer is under review.
            </p>
          )}
          {!unlocked && verificationStatus === "rejected" && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-rust">
              <Lock size={13} /> Restricted access — your last submission wasn't approved, resubmit on the board tab.
            </p>
          )}
          {!unlocked && !verificationStatus && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber">
              <Lock size={13} /> Restricted access — upload your offer to request full access.
            </p>
          )}
        </motion.div>

        <div className="mt-6 flex gap-2 border-b border-inkline">
          <button
            onClick={() => setTab("chat")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "chat" ? "border-b-2 border-amber text-amber" : "text-slate"}`}
          >
            Chatroom
          </button>
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

        {tab === "chat" && userId && (
          <div className="mt-6">
            <ChatRoom city={params.city as any} myId={userId} myName={myName || "You"} />
          </div>
        )}

        {tab === "directory" && (
          <div className="mt-6">
            <input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search by name…"
              className="glass-input mb-4 w-full rounded-xl px-4 py-2.5 text-sm text-paper outline-none"
            />

            {!unlocked && (
              <div className="mb-4 rounded-xl border border-dashed border-inkline/70 bg-inkline/10 p-3 text-xs text-slate">
                Names only for now — upload your offer to see company, branch and bio for everyone here.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {unlocked && filteredMembers.length === 0 && (
                <p className="text-sm text-slate">
                  {members.length === 0 ? "No one else has unlocked yet — you're the first." : "No matches."}
                </p>
              )}
              {unlocked && (
                <AnimatePresence>
                  {filteredMembers.map((m, i) => (
                    <motion.div key={m.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <MemberCard member={m} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {!unlocked && filteredNames.length === 0 && (
                <p className="text-sm text-slate">No one else has joined yet — you're the first.</p>
              )}
              {!unlocked && (
                <AnimatePresence>
                  {filteredNames.map((m, i) => (
                    <motion.div
                      key={m.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card flex items-center gap-3 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/15 font-mono text-xs font-bold text-amber">
                        {m.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
                      </div>
                      <p className="truncate text-sm text-paper/90">{m.full_name}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {tab === "board" && !unlocked && userId && verificationStatus === "pending" && (
          <div className="mt-6 max-w-md glass-card p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
              Under review
            </p>
            <h3 className="mt-2 font-semibold text-paper">
              Your offer for {myCompany} is being checked
            </h3>
            <p className="mt-1 text-sm text-slate">
              An admin verifies these by hand, so it can take a bit. You'll
              get an email the moment it's approved.
            </p>
          </div>
        )}

        {tab === "board" && !unlocked && userId && verificationStatus === "rejected" && (
          <div className="mt-6 max-w-md">
            <div className="glass-card mb-4 p-4">
              <p className="font-mono text-xs uppercase tracking-widest2 text-rust">
                Not verified
              </p>
              <p className="mt-1 text-sm text-slate">
                {reviewNote || "Your last submission wasn't approved — try again with a clearer screenshot."}
              </p>
            </div>
            <UploadOfferPanel
              userId={userId}
              city={params.city as any}
              onSubmitted={() => {
                setVerificationStatus("pending");
              }}
            />
          </div>
        )}

        {tab === "board" && !unlocked && userId && !verificationStatus && (
          <div className="mt-6 max-w-md">
            <UploadOfferPanel
              userId={userId}
              city={params.city as any}
              onSubmitted={() => {
                setVerificationStatus("pending");
              }}
            />
          </div>
        )}

        {tab === "board" && unlocked && (
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
                className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90"
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
                    className="glass-input rounded-xl px-3 py-2 text-sm text-paper outline-none"
                  >
                    <option value="flat">Looking for a flat</option>
                    <option value="roommate">Looking for a roommate</option>
                    <option value="pg">Looking for a PG</option>
                  </select>
                  <input
                    placeholder="Title, e.g. 2BHK near Cyber Hub, need 1 flatmate"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                  <textarea
                    placeholder="Budget, area, move-in date, anything relevant…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                  <input
                    placeholder="Phone / WhatsApp / email to contact you on"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                  <input
                    placeholder="Tags, comma separated — e.g. sector-49, girls-only, near-metro"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-paper outline-none"
                  />
                  {formError && <p className="text-sm text-rust">{formError}</p>}
                  <button
                    type="submit"
                    disabled={posting}
                    className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-amber/90 disabled:opacity-50"
                  >
                    {posting ? "Posting…" : "Post to board"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {filteredPosts.length === 0 && (
                <p className="text-sm text-slate">No posts yet. Be the first to look for a flat, PG or roommate.</p>
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
