"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardIndex() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function route() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("city_memberships")
        .select("city")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data) {
        router.replace("/onboarding");
      } else {
        router.replace(`/dashboard/${data.city}`);
      }
    }
    route();
  }, [supabase, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-sm text-slate">Loading your board…</p>
    </main>
  );
}
