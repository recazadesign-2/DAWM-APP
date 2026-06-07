import { supabase } from "@/integrations/supabase/client";

export async function trackEvent(event_name: string, opts: { page?: string; duration_seconds?: number; metadata?: Record<string, any> } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name,
      user_id: user?.id ?? null,
      page: opts.page,
      duration_seconds: opts.duration_seconds,
      metadata: opts.metadata,
    });
  } catch {
    /* analytics is best-effort */
  }
}