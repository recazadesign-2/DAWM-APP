// Offline-first outbox: queue mutations locally, flush when online.
// Used by daily-progress / reading sync to survive flaky connections.

import { supabase } from "@/integrations/supabase/client";

type Op =
  | { type: "daily_progress"; payload: Record<string, unknown> }
  | { type: "reading_state"; payload: { last_page: number } }
  | { type: "bookmark_upsert"; payload: { page: number; note: string | null } }
  | { type: "bookmark_delete"; payload: { page: number } };

const KEY = "dawm:outbox:v1";

function read(): Op[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(ops: Op[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    /* ignore quota */
  }
}

export function enqueue(op: Op) {
  const ops = read();
  // Coalesce identical-type ops by keeping the most recent for these "state" types.
  if (op.type === "daily_progress" || op.type === "reading_state") {
    const filtered = ops.filter((o) => o.type !== op.type);
    filtered.push(op);
    write(filtered);
  } else {
    ops.push(op);
    write(ops);
  }
  // Try immediate flush
  flush().catch(() => {});
}

let flushing = false;

export async function flush(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  flushing = true;
  try {
    let ops = read();
    while (ops.length) {
      const op = ops[0];
      try {
        if (op.type === "daily_progress") {
          const payload = { ...op.payload, user_id: user.id };
          const { error } = await supabase
            .from("user_daily_progress")
            .upsert(payload as never, { onConflict: "user_id,date" });
          if (error) throw error;
        } else if (op.type === "reading_state") {
          const { error } = await supabase
            .from("reading_state")
            .upsert({
              user_id: user.id,
              last_page: op.payload.last_page,
              updated_at: new Date().toISOString(),
            } as never);
          if (error) throw error;
        } else if (op.type === "bookmark_upsert") {
          const { error } = await supabase
            .from("bookmarks")
            .upsert(
              {
                user_id: user.id,
                page: op.payload.page,
                note: op.payload.note,
              } as never,
              { onConflict: "user_id,page" },
            );
          if (error) throw error;
        } else if (op.type === "bookmark_delete") {
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("page", op.payload.page);
          if (error) throw error;
        }
        // success: drop the op
        ops.shift();
        write(ops);
      } catch {
        // Network/server failure: stop and retry later
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

export function initOutbox() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => flush().catch(() => {}));
  // Periodic safety flush every 60s
  window.setInterval(() => flush().catch(() => {}), 60_000);
  // Initial attempt shortly after boot
  window.setTimeout(() => flush().catch(() => {}), 3_000);
}
