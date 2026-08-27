"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const TABLES = ["sessions", "plans", "tasks", "projects"] as const;

/**
 * Refreshes the current route's server data whenever sessions/plans/tasks/
 * projects change. Debounced so a burst of writes (e.g. a TodoWrite sync
 * inserting many tasks at once) triggers one refresh, not one per row.
 */
export function LiveRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) return;

    const scheduleRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    let channel = client.channel("cc-track:writes");
    for (const table of TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      client.removeChannel(channel);
    };
  }, [router]);

  return null;
}
