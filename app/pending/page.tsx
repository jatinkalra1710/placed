"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Access is self-serve now (no more waiting on admin approval), so this
// page is no longer part of the flow. Kept as a redirect in case any old
// links/bookmarks point here.
export default function PendingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
