// Quran.com public API service — page-based browsing (1..604)

export interface QuranWord {
  id: number;
  position: number;
  text_uthmani: string;
  char_type_name: string;
  line_number: number;
  page_number: number;
}

export interface QuranVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  words: QuranWord[];
  audio?: { url: string };
}

export interface QuranPageData {
  verses: QuranVerse[];
  meta: {
    surah_name: string;
    surah_number: number;
    juz_number: number;
    hizb_number?: number;
    rub_number?: number;
    page_number: number;
  };
}

export interface Surah {
  id: number;
  name_arabic: string;
  name_complex: string;
  verses_count: number;
  pages: number[];
  revelation_place?: string;
}

export interface Reciter {
  id: number;
  name: string;
}

const BASE_URL = "https://api.quran.com/api/v4";
const AUDIO_BASE = "https://verses.quran.com/";
export const TOTAL_QURAN_PAGES = 604;

export const RECITERS: Reciter[] = [
  // IDs from quran.com /recitations endpoint — verified mapping
  { id: 7, name: "مشاري راشد العفاسي" },
  { id: 3, name: "عبد الرحمن السديس" },
  { id: 2, name: "عبد الباسط عبد الصمد (مرتل)" },
  { id: 4, name: "أبو بكر الشاطري" },
  { id: 5, name: "هاني الرفاعي" },
  { id: 6, name: "محمود خليل الحصري" },
  { id: 9, name: "ماهر المعيقلي" },
];

export const TAFSIR_ID = 16; // التفسير الميسر (عربي)

export async function fetchQuranPage(pageNumber: number): Promise<QuranPageData> {
  const url = `${BASE_URL}/verses/by_page/${pageNumber}?language=ar&words=true&word_fields=text_uthmani,line_number,page_number&fields=text_uthmani,juz_number,hizb_number,rub_el_hizb_number,verse_number`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Quran page");
  const data = await res.json();
  if (!data.verses?.length) throw new Error("No verses for this page");

  const firstVerseKey: string = data.verses[0].verse_key;
  const surahNumber = parseInt(firstVerseKey.split(":")[0], 10);
  let surahName = "";
  try {
    const sRes = await fetch(`${BASE_URL}/chapters/${surahNumber}?language=ar`);
    if (sRes.ok) {
      const sData = await sRes.json();
      surahName = sData.chapter?.name_arabic ?? "";
    }
  } catch {
    /* ignore */
  }

  return {
    verses: data.verses,
    meta: {
      surah_name: surahName,
      surah_number: surahNumber,
      juz_number: data.verses[0].juz_number,
      hizb_number: data.verses[0].hizb_number,
      rub_number: data.verses[0].rub_el_hizb_number,
      page_number: pageNumber,
    },
  };
}

export async function fetchSurahs(): Promise<Surah[]> {
  const res = await fetch(`${BASE_URL}/chapters?language=ar`);
  if (!res.ok) throw new Error("Failed to fetch surahs");
  const data = await res.json();
  return data.chapters;
}

export async function fetchVerseAudioUrl(
  reciterId: number,
  verseKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/recitations/${reciterId}/by_ayah/${verseKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | undefined = data.audio_files?.[0]?.url;
    if (!url) return null;
    return url.startsWith("http") ? url : `${AUDIO_BASE}${url}`;
  } catch {
    return null;
  }
}

export async function fetchVerseTafsir(verseKey: string): Promise<string | null> {
  // Try Muyassar first, then fall back to Ibn Kathir, then Sa'di, then Tabari
  const tafsirIds = [TAFSIR_ID, 14, 91, 15];
  for (const id of tafsirIds) {
    try {
      const res = await fetch(`${BASE_URL}/tafsirs/${id}/by_ayah/${verseKey}`);
      if (!res.ok) continue;
      const data = await res.json();
      const text: string | undefined = data?.tafsir?.text;
      if (text && text.trim()) {
        return text.replace(/<[^>]+>/g, "").trim();
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
