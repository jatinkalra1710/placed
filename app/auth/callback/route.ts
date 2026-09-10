import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Most likely cause: the database trigger rejected a non-@thapar.edu
      // Google account. Send them back to /login with a friendly message
      // instead of a broken redirect.
      return NextResponse.redirect(`${origin}/login?error=domain`);
    }

    // Admins land straight on the review queue when they sign in — they can
    // always get to their own student board afterward via the "Board" nav link.
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role === "admin") {
        return NextResponse.redirect(`${origin}/admin`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
