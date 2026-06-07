import { supabase } from "@/integrations/supabase/client";

const LAST_KEY = "dawm:reading:lastPage";
const BOOKMARKS_KEY = "dawm:reading:bookmarks";

export interface BookmarkRow {
  id: string;
  page: number;
  note?: string | null;
  created_at: string;
}

function readLocalBookmarks(): BookmarkRow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]"); } catch { return []; }
}
function writeLocalBookmarks(b: BookmarkRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(b));
}

export const readingSync = {
  async saveLastPage(page: number) {
    if (typeof window !== "undefined") localStorage.setItem(LAST_KEY, String(page));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("reading_state").upsert({ user_id: user.id, last_page: page, updated_at: new Date().toISOString() });
  },
  async loadLastPage(): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("reading_state").select("last_page").eq("user_id", user.id).maybeSingle();
      if (data?.last_page) return data.last_page;
    }
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LAST_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (!isNaN(n)) return n;
    }
    return null;
  },
  async listBookmarks(): Promise<BookmarkRow[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("bookmarks").select("id,page,note,created_at").order("created_at", { ascending: false });
      return data || [];
    }
    return readLocalBookmarks();
  },
  async addBookmark(page: number, note?: string): Promise<BookmarkRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from("bookmarks").upsert({ user_id: user.id, page, note: note ?? null }, { onConflict: "user_id,page" }).select("id,page,note,created_at").single();
      if (error) return null;
      return data as BookmarkRow;
    }
    const list = readLocalBookmarks().filter(b => b.page !== page);
    const row: BookmarkRow = { id: crypto.randomUUID(), page, note: note ?? null, created_at: new Date().toISOString() };
    writeLocalBookmarks([row, ...list]);
    return row;
  },
  async removeBookmark(page: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("page", page);
      return;
    }
    writeLocalBookmarks(readLocalBookmarks().filter(b => b.page !== page));
  },
};
