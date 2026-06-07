import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  List,
  Loader2,
  Settings as SettingsIcon,
  X,
  Bookmark,
  BookmarkCheck,
  Mic2,
  Play,
  Pause,
  Search,
  Type,
  Menu,
  Eye,
  BookOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas-pro";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useMushafMode } from "@/hooks/useMushafMode";
import { progressService } from "@/services/progressService";
import { trackEvent } from "@/services/analyticsService";
import { readingSync, type BookmarkRow } from "@/services/readingSyncService";
import { recordReadingOpened } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchQuranPage,
  fetchSurahs,
  fetchVerseAudioUrl,
  fetchVerseTafsir,
  RECITERS,
  TOTAL_QURAN_PAGES,
  type QuranPageData,
  type Surah,
} from "@/services/quranService";

export const Route = createFileRoute("/reading")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — مصحف المدينة" },
      { name: "description", content: "تجربة قراءة كلاسيكية للمصحف الشريف." },
    ],
  }),
  component: ReadingPage,
});

const FOCUS_MARK = 120;
const STORAGE_KEY = "dawm:reading:lastPage";
const RECITER_KEY = "dawm:reading:reciter";
const TAFSIR_KEY = "dawm:reading:tafsir";
const FONT_KEY = "dawm:reading:fontScale";

const SURAH_SHORTCUTS: { name: string; page: number }[] = [
  { name: "الكهف", page: 293 },
  { name: "يس", page: 440 },
  { name: "الواقعة", page: 534 },
  { name: "تبارك", page: 562 },
];

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabic = (n: number) =>
  String(n)
    .split("")
    .map((d) => (/\d/.test(d) ? ARABIC_DIGITS[parseInt(d, 10)] : d))
    .join("");

function ReadingPage() {
  const { state, syncWirdFromProgress } = useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mushafMode, setMushafMode] = useMushafMode();

  const [page, setPage] = useState<number>(1);
  const [pageData, setPageData] = useState<QuranPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsOnPage, setSecondsOnPage] = useState(0);
  const [showSurahs, setShowSurahs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReciters, setShowReciters] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [bookmarkPulse, setBookmarkPulse] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [pagePlaying, setPagePlaying] = useState(false);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const countedRef = useRef<Set<number>>(new Set());
  const playQueueRef = useRef<{ verses: string[]; idx: number } | null>(null);
  const [fontScale, setFontScale] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return parseFloat(localStorage.getItem(FONT_KEY) || "1") || 1;
  });
  const [autoFit, setAutoFit] = useState(1);
  const autoFitRef = useRef(1);
  const fontScaleRef = useRef(1);
  useEffect(() => { autoFitRef.current = autoFit; }, [autoFit]);
  useEffect(() => { fontScaleRef.current = fontScale; }, [fontScale]);
  const linesContainerRef = useRef<HTMLDivElement | null>(null);

  // Dev-only RTL alignment test: enable with ?rtltest=1 to preview the page
  // sheet at multiple narrow breakpoints and verify no word clipping.
  const [rtlTest, setRtlTest] = useState(false);
  const [testWidth, setTestWidth] = useState<number>(375);
  const pageSheetRef = useRef<HTMLDivElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("rtltest") === "1") setRtlTest(true);
  }, []);

  const captureScreenshot = async () => {
    const node = pageSheetRef.current;
    if (!node) return;
    try {
      setCapturing(true);
      const canvas = await html2canvas(node, {
        backgroundColor: "#f3e7c9",
        scale: window.devicePixelRatio || 2,
        useCORS: true,
      });
      const w = canvas.width;
      const h = canvas.height;
      canvas.toBlob((blob: any) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mushaf-${testWidth}px-${w}x${h}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch (e) {
      console.error("screenshot failed", e);
    } finally {
      setCapturing(false);
    }
  };

  const [reciterId, setReciterId] = useState<number>(() => {
    if (typeof window === "undefined") return RECITERS[0].id;
    return parseInt(localStorage.getItem(RECITER_KEY) || "", 10) || RECITERS[0].id;
  });
  const [tafsirMode, setTafsirMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TAFSIR_KEY) === "1";
  });
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<{ key: string; text: string } | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Init: load last read page (prefer ?page= query, then last-completed+1, then last-read)
  useEffect(() => {
    recordReadingOpened();
    const prog = progressService.get();
    countedRef.current = new Set(
      prog.trackedPages.filter((p) => p.counted).map((p) => p.pageNumber),
    );
    let initial: number;
    const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("page") : null;
    const qNum = q ? parseInt(q, 10) : NaN;
    if (!isNaN(qNum) && qNum >= 1 && qNum <= TOTAL_QURAN_PAGES) {
      initial = qNum;
    } else {
      const continueAt =
        prog.lastCompletedPage !== undefined && prog.targetGoal && !prog.completed
          ? prog.lastCompletedPage + 1
          : null;
      const start = continueAt ?? prog.lastReadPage ?? state.lastReadPage ?? 1;
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      initial =
        !isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_QURAN_PAGES ? parsed : start;
    }
    setPage(initial);
    progressService.startPageTimer(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(page)); } catch { /* ignore */ }
  }, [page]);
  useEffect(() => {
    try { localStorage.setItem(RECITER_KEY, String(reciterId)); } catch { /* ignore */ }
  }, [reciterId]);
  useEffect(() => {
    try { localStorage.setItem(TAFSIR_KEY, tafsirMode ? "1" : "0"); } catch { /* ignore */ }
  }, [tafsirMode]);
  useEffect(() => {
    try { localStorage.setItem(FONT_KEY, String(fontScale)); } catch { /* ignore */ }
  }, [fontScale]);

  // Sync last-read page (Supabase for logged-in users, localStorage otherwise)
  useEffect(() => {
    let mounted = true;
    readingSync.loadLastPage().then((p) => {
      if (!mounted || !p) return;
      if (p >= 1 && p <= TOTAL_QURAN_PAGES) {
        setPage(p);
        progressService.startPageTimer(p);
      }
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useEffect(() => {
    const t = setTimeout(() => { readingSync.saveLastPage(page); }, 400);
    return () => clearTimeout(t);
  }, [page]);

  // Load bookmarks
  useEffect(() => {
    readingSync.listBookmarks().then(setBookmarks);
  }, [user?.id]);
  const isBookmarked = bookmarks.some((b) => b.page === page);
  const toggleBookmark = async () => {
    setBookmarkPulse((n) => n + 1);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    if (isBookmarked) {
      await readingSync.removeBookmark(page);
      setBookmarks((prev) => prev.filter((b) => b.page !== page));
      toast("تم إزالة الإشارة");
    } else {
      const row = await readingSync.addBookmark(page);
      if (row) setBookmarks((prev) => [row, ...prev]);
      toast("تم حفظ الصفحة في الإشارات");
    }
  };

  // Load page data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSecondsOnPage(0);
    fetchQuranPage(page)
      .then((data) => { if (!cancelled) setPageData(data); })
      .catch((e) => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  // Visibility / lifecycle: implements buffer (≤10s) + hard reset rules
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.hidden) progressService.handleHidden();
      else progressService.handleVisible();
    };
    const onPageHide = () => progressService.handleHidden();
    const onPageShow = () => progressService.handleVisible();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Stillness: any user interaction refreshes the focus signal
  useEffect(() => {
    const mark = () => progressService.noteInteraction();
    window.addEventListener("touchstart", mark, { passive: true });
    window.addEventListener("pointerdown", mark, { passive: true });
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      window.removeEventListener("touchstart", mark);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark);
    };
  }, []);

  // Silent focus timer (internal)
  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => {
      setSecondsOnPage((s) => {
        const next = s + 1;
        if (next % 10 === 0) {
          progressService.tickLastPage();
          syncWirdFromProgress();
          const prog = progressService.get();
          countedRef.current = new Set(
            prog.trackedPages.filter((p) => p.counted).map((p) => p.pageNumber),
          );
        }
        if (next === FOCUS_MARK && !countedRef.current.has(page)) {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
          trackEvent("page_counted_120s", { page: String(page) });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [loading, page, syncWirdFromProgress]);

  // Navigate to completion only once when the wird is first completed;
  // after that, allow continued reading without auto-redirecting.
  useEffect(() => {
    if (!state.wird.completed) return;
    if (state.wird.pagesRead < state.dailyWirdPages) return;
    try {
      const key = `dawm:completion-shown:${new Date().toDateString()}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => navigate({ to: "/completion" }), 800);
    return () => clearTimeout(t);
  }, [state.wird.completed, state.wird.pagesRead, state.dailyWirdPages, navigate]);

  useEffect(() => {
    if (!showSurahs || surahs.length) return;
    fetchSurahs().then(setSurahs).catch((e) => console.error(e));
  }, [showSurahs, surahs.length]);

  // Always have surahs loaded so we can label mid-page surah starts
  useEffect(() => {
    if (surahs.length) return;
    fetchSurahs().then(setSurahs).catch(() => {});
  }, [surahs.length]);

  const goPrev = () => {
    if (page <= 1) return;
    const oldPage = page;
    setDirection(-1);
    setPage((p) => p - 1);
    progressService.handlePageTransition(oldPage, oldPage - 1);
    syncWirdFromProgress();
  };
  const goNext = () => {
    if (page >= TOTAL_QURAN_PAGES) return;
    const oldPage = page;
    const wasCounted = countedRef.current.has(oldPage);
    // The "due" page = the page right after the last counted page.
    // Only show the failure toast when the user tries to advance *from* that
    // due page without satisfying the time law.
    const progBefore = progressService.get();
    const dueBefore =
      (progBefore.lastCompletedPage !== undefined
        ? progBefore.lastCompletedPage + 1
        : progBefore.startPage ?? oldPage);
    setDirection(1);
    setPage((p) => p + 1);
    const data = progressService.handlePageTransition(oldPage, oldPage + 1);
    countedRef.current = new Set(
      data.trackedPages.filter((p) => p.counted).map((p) => p.pageNumber),
    );
    if (!wasCounted && !countedRef.current.has(oldPage) && oldPage === dueBefore) {
      toast("لم يتم احتساب الصفحه");
    }
    syncWirdFromProgress();
  };

  const lines = useMemo(() => {
    if (!pageData) return [] as Array<Array<{ text: string; verse_key: string; isMarker: boolean; verse_number: number; surah_id: number }>>;
    type Tok = { text: string; verse_key: string; isMarker: boolean; verse_number: number; surah_id: number };
    const map: Record<number, Tok[]> = {};
    pageData.verses.forEach((v) => {
      v.words.forEach((w) => {
        const ln = w.line_number || 1;
        if (!map[ln]) map[ln] = [];
        const isMarker = w.char_type_name === "end";
        const surah_id = parseInt(v.verse_key.split(":")[0], 10);
        map[ln].push({
          text: w.text_uthmani,
          verse_key: v.verse_key,
          isMarker,
          verse_number: v.verse_number,
          surah_id,
        });
      });
    });
    return Object.keys(map)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b)
      .map((k) => map[k]);
  }, [pageData]);

  const surahNameById = useMemo(() => {
    const m: Record<number, string> = {};
    surahs.forEach((s) => { m[s.id] = s.name_arabic; });
    return m;
  }, [surahs]);

  // Auto-fit: shrink font so every mushaf line fits on ONE visual line.
  // This guarantees the page matches the printed Madinah mushaf (same line
  // count, same first/last word per line) and avoids orphan words.
  useEffect(() => {
    if (!pageData || mushafMode !== "interactive") return;
    const measure = () => {
      const container = linesContainerRef.current;
      if (!container) return;
      const nodes = container.querySelectorAll<HTMLElement>(".mushaf-line:not(.is-center)");
      // Compute the base "fit em" — em that makes every line fit on a single
      // visual line — INDEPENDENT of the user's fontScale. Effective applied
      // em currently = fontScale * autoFit.
      const currentEm = (fontScaleRef.current || 1) * (autoFitRef.current || 1);
      let baseFit = Infinity;
      nodes.forEach((n) => {
        const cw = n.clientWidth;
        const sw = n.scrollWidth;
        if (cw > 0 && sw > 0) {
          const em = (cw / sw) * currentEm;
          if (em < baseFit) baseFit = em;
        }
      });
      if (!isFinite(baseFit)) baseFit = 1;
      // baseFit is the line-fit baseline; user fontScale multiplies on top.
      setAutoFit(Math.max(0.55, Math.min(1, baseFit * 0.985)));
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [pageData, mushafMode]);

  const playVerse = async (verseKey: string) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const url = await fetchVerseAudioUrl(reciterId, verseKey);
      if (!url) return;
      const a = new Audio(url);
      audioRef.current = a;
      setPlayingKey(verseKey);
      a.onended = () => setPlayingKey((k) => (k === verseKey ? null : k));
      a.onerror = () => setPlayingKey(null);
      a.play().catch(() => setPlayingKey(null));
    } catch { setPlayingKey(null); }
  };

  const openTafsir = async (verseKey: string) => {
    setTafsirVerse({ key: verseKey, text: "" });
    setTafsirLoading(true);
    const text = await fetchVerseTafsir(verseKey);
    setTafsirLoading(false);
    setTafsirVerse({ key: verseKey, text: text || "تعذّر جلب التفسير الآن." });
  };

  const onWordClick = (verseKey: string) => {
    if (tafsirMode) openTafsir(verseKey);
    else playVerse(verseKey);
  };
  const onMarkerClick = (verseKey: string) => {
    if (tafsirMode) openTafsir(verseKey);
    else playVerse(verseKey);
  };

  useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);

  // Stop play-page session when navigating page
  useEffect(() => {
    setPagePlaying(false);
    setActiveVerseKey(null);
    playQueueRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, [page]);

  const playPage = async () => {
    if (!pageData) return;
    if (pagePlaying) {
      setPagePlaying(false);
      setActiveVerseKey(null);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      playQueueRef.current = null;
      return;
    }
    const verses = Array.from(new Set(pageData.verses.map((v) => v.verse_key)));
    playQueueRef.current = { verses, idx: 0 };
    setPagePlaying(true);
    playNextInQueue();
  };
  const playNextInQueue = async () => {
    const q = playQueueRef.current;
    if (!q || q.idx >= q.verses.length) {
      setPagePlaying(false);
      setActiveVerseKey(null);
      playQueueRef.current = null;
      return;
    }
    const verseKey = q.verses[q.idx];
    setActiveVerseKey(verseKey);
    const url = await fetchVerseAudioUrl(reciterId, verseKey);
    if (!url) { q.idx++; playNextInQueue(); return; }
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => {
      const cur = playQueueRef.current;
      if (!cur) return;
      cur.idx++;
      playNextInQueue();
    };
    a.onerror = () => {
      const cur = playQueueRef.current;
      if (!cur) return;
      cur.idx++;
      playNextInQueue();
    };
    a.play().catch(() => {
      const cur = playQueueRef.current;
      if (!cur) return;
      cur.idx++;
      playNextInQueue();
    });
  };

  const meta = pageData?.meta;
  // First verse on the page starts at ayah 1 → this page contains the surah opening (use ornate frame)
  const isSurahStart = !!pageData?.verses?.[0] && pageData.verses[0].verse_number === 1;

  // Swipe handlers (horizontal). In RTL mushaf: swipe right-to-left = next page, left-to-right = previous.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <main
      dir="rtl"
      className={`h-[100dvh] overflow-hidden mushaf-paper select-none flex flex-col ${mushafMode === "paper" ? "mushaf-paper-mode" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ perspective: 1600 }}
    >
      <div className="max-w-[460px] w-full mx-auto px-3 pt-2 pb-2 relative flex-1 flex flex-col min-h-0">
        {rtlTest && (
          <div
            dir="rtl"
            className="mb-2 flex items-center justify-between gap-2 rounded-md border border-[#b08a3a] bg-[#f5e9cb]/80 px-3 py-1.5 text-[12px] mushaf-ink"
          >
            <span className="font-bold mushaf-gold">اختبار RTL</span>
            <div className="flex items-center gap-1">
              {[320, 360, 375, 414].map((w) => (
                <button
                  key={w}
                  onClick={() => setTestWidth(w)}
                  className={`px-2 py-1 rounded border ${
                    testWidth === w
                      ? "bg-[#b08a3a] text-white border-[#b08a3a]"
                      : "border-[#b08a3a] mushaf-gold"
                  }`}
                >
                  {w}px
                </button>
              ))}
              <button
                onClick={captureScreenshot}
                disabled={capturing}
                className="ms-1 px-2 py-1 rounded border border-[#b08a3a] mushaf-gold disabled:opacity-50"
              >
                {capturing ? "..." : "📸 PNG"}
              </button>
              <button
                onClick={() => setRtlTest(false)}
                className="ms-2 px-2 py-1 rounded border border-[#b08a3a] mushaf-gold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
        {/* Minimal pill header */}
        <header className="mb-2 dawm-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Link to="/" className="mushaf-pill-btn shrink-0" aria-label="رجوع">
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => setShowSurahs(true)}
              className="mushaf-pill flex-1 min-w-0"
              aria-label="فهرس السور"
            >
              <span className="text-[13px] font-bold mushaf-ink truncate font-quran">
                {meta ? `سُورَةُ ${meta.surah_name}` : "—"}
              </span>
            </button>
            <button
              onClick={() => setShowJump(true)}
              className="mushaf-pill flex-1 min-w-0"
              aria-label="الجزء والصفحة"
            >
              <span className="text-[12px] mushaf-ink truncate font-quran">
                {meta ? `الجزء ${toArabic(meta.juz_number)}` : "—"}
              </span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="mushaf-pill-btn shrink-0"
              aria-label="إعدادات"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* Page sheet — clean, no decorative frame, fits viewport */}
        <div
          ref={pageSheetRef}
          className="relative rounded-md mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{
            ...(rtlTest
              ? { width: testWidth, maxWidth: "100%", outline: "1px dashed #b08a3a" }
              : null),
          }}
        >

          {loading ? (
            <div className="flex items-center justify-center flex-1 mushaf-gold">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : mushafMode === "paper" ? (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`paper-${page}`}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 min-h-0 flex items-center justify-center px-1 py-1"
              >
                <img
                  src={`https://maknoon.com/quran/hafs/${page}.svgz`}
                  alt={`صفحة ${toArabic(page)} من المصحف الشريف`}
                  loading="eager"
                  draggable={false}
                  className="max-w-full max-h-full select-none pointer-events-none"
                  style={{ objectFit: "contain" }}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={page}
                initial={{ opacity: 0, rotateY: direction * 90, x: direction * 40 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -direction * 90, x: -direction * 40 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  transformOrigin: direction === 1 ? "left center" : "right center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
                className="px-2 sm:px-4 pt-1 pb-1 flex-1 min-h-0 flex flex-col"
              >
                {meta && isSurahStart && (
                  <div className="mushaf-surah-banner shrink-0">
                    <div className="mushaf-surah-banner-inner">
                      <div className="font-quran text-xl leading-tight">سُورَةُ {meta.surah_name}</div>
                    </div>
                  </div>
                )}
                {meta && isSurahStart && pageData?.verses?.[0] &&
                  parseInt(pageData.verses[0].verse_key.split(":")[0], 10) !== 1 &&
                  parseInt(pageData.verses[0].verse_key.split(":")[0], 10) !== 9 && (
                    <p className="mushaf-line is-center shrink-0">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                  )}

                {/* Text block — fills remaining vertical space */}
                <div className="px-1 py-1 flex-1 min-h-0 flex flex-col" style={{ fontSize: `${fontScale * autoFit}em` }} data-user-scale={fontScale > 1 ? "up" : "fit"}>
                  <div ref={linesContainerRef} className="mushaf-page-fit flex-1 min-h-0">
                    {(() => {
                      let prevSurah = lines[0]?.[0]?.surah_id ?? 0;
                      const out: React.ReactNode[] = [];
                      lines.forEach((words, i) => {
                        const firstTok = words[0];
                        const surahHere = firstTok?.surah_id ?? prevSurah;
                        const isNewSurahStart =
                          i > 0 &&
                          firstTok &&
                          firstTok.verse_number === 1 &&
                          surahHere !== prevSurah;
                        if (isNewSurahStart) {
                          const name = surahNameById[surahHere] || "";
                          out.push(
                            <div key={`banner-${surahHere}`} className="mushaf-surah-banner mt-2">
                              <div className="mushaf-surah-banner-inner">
                                <div className="font-quran text-xl leading-tight">سُورَةُ {name}</div>
                              </div>
                            </div>,
                          );
                          if (surahHere !== 9) {
                            out.push(
                              <p key={`basmala-${surahHere}`} className="mushaf-line is-center">
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                              </p>,
                            );
                          }
                        }
                        prevSurah = surahHere;
                        const lineHasActive = activeVerseKey
                          ? words.some((w) => w.verse_key === activeVerseKey)
                          : false;
                        out.push(
                          <p
                            key={i}
                            className="mushaf-line"
                            style={lineHasActive ? { background: "rgba(212,175,110,0.18)", borderRadius: 6, transition: "background .25s" } : undefined}
                          >
                            {words.map((w, j) =>
                              w.isMarker ? (
                            <span
                              key={j}
                              className="mushaf-ayah-marker"
                              onClick={() => onMarkerClick(w.verse_key)}
                              title={`آية ${toArabic(w.verse_number)}`}
                            >
                              {toArabic(w.verse_number)}
                            </span>
                          ) : (
                            <span
                              key={j}
                              className={`mushaf-word ${playingKey === w.verse_key || activeVerseKey === w.verse_key ? "playing" : ""}`}
                              onClick={() => onWordClick(w.verse_key)}
                            >
                              {w.text}{" "}
                            </span>
                              ),
                            )}
                          </p>,
                        );
                      });
                      return out;
                    })()}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {countedRef.current.has(page) && (
            <span
              className="absolute right-2 bottom-2 inline-flex items-center justify-center w-6 h-6 rounded-md border"
              style={{
                background: "color-mix(in oklab, #1f9d6b 18%, transparent)",
                borderColor: "#1f9d6b",
                color: "#0f6b48",
                boxShadow: "0 0 10px -2px rgba(31,157,107,0.55)",
              }}
              title="تم احتساب هذه الصفحة"
              aria-label="تم احتساب هذه الصفحة"
            >
              <BookmarkCheck size={14} />
            </span>
          )}
        </div>

        {/* Bottom dock */}
        <div className="mt-2 shrink-0 flex items-center justify-center">
          <div className="mushaf-bottom-dock">
            <button
              onClick={toggleBookmark}
              className={`mushaf-pill-btn ${isBookmarked ? "is-active" : ""}`}
              aria-label={isBookmarked ? "إزالة من الإشارات" : "حفظ في الإشارات"}
            >
              <motion.span
                key={`pulse-${bookmarkPulse}`}
                initial={{ scale: 0.7, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 380 }}
                className="inline-flex"
              >
                <Eye size={18} />
              </motion.span>
            </button>
            <button
              onClick={() => { setJumpInput(String(page)); setShowJump(true); }}
              className="mushaf-pill"
              aria-label="الانتقال إلى صفحة"
            >
              <BookOpen size={14} className="opacity-70" />
              <span className="font-quran text-base mushaf-ink tabular-nums ms-1">{toArabic(page)}</span>
            </button>
            {SURAH_SHORTCUTS.map((s) => (
              <button
                key={s.page}
                onClick={() => {
                  const oldPage = page;
                  setDirection(s.page > oldPage ? 1 : -1);
                  setPage(s.page);
                  progressService.handlePageTransition(oldPage, s.page);
                  syncWirdFromProgress();
                }}
                className="mushaf-surah-chip"
                aria-label={s.name}
                title={s.name}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-sm mushaf-modal rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold mushaf-ink">الإعدادات</h2>
                <button onClick={() => setShowSettings(false)} className="mushaf-gold"><X size={18} /></button>
              </div>

              <label className="block text-xs mushaf-gold mb-1">القارئ</label>
              <select
                value={reciterId}
                onChange={(e) => setReciterId(parseInt(e.target.value, 10))}
                className="w-full mushaf-input rounded-md p-2 text-sm mushaf-ink mb-4"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <label className="block text-xs mushaf-gold mb-2">وضع المصحف</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setMushafMode("interactive")}
                  className="mushaf-pill justify-center text-xs py-2"
                  style={mushafMode === "interactive" ? { boxShadow: "inset 0 0 0 2px var(--mushaf-ornament)" } : undefined}
                >
                  <BookOpen size={14} />
                  <span>تفاعلي</span>
                </button>
                <button
                  onClick={() => setMushafMode("paper")}
                  className="mushaf-pill justify-center text-xs py-2"
                  style={mushafMode === "paper" ? { boxShadow: "inset 0 0 0 2px var(--mushaf-ornament)" } : undefined}
                >
                  <BookOpen size={14} />
                  <span>ورقي</span>
                </button>
              </div>

              <label className="block text-xs mushaf-gold mb-2">حجم الخط</label>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setFontScale((s) => Math.max(0.7, +(s - 0.1).toFixed(2)))}
                  className="mushaf-iconbtn dawm-press"
                  style={{ width: 36, height: 36 }}
                  aria-label="تصغير الخط"
                >
                  <Type size={14} />
                  <span className="text-[10px] -ms-1">−</span>
                </button>
                <button
                  onClick={() => setFontScale(1)}
                  className="flex-1 text-center text-xs mushaf-ink tabular-nums mushaf-pill justify-center py-1.5"
                  aria-label="إعادة ضبط حجم الخط"
                  title="إعادة الضبط"
                >
                  {Math.round(fontScale * 100)}%
                </button>
                <button
                  onClick={() => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
                  className="mushaf-iconbtn dawm-press"
                  style={{ width: 36, height: 36 }}
                  aria-label="تكبير الخط"
                >
                  <Type size={18} />
                  <span className="text-[10px] -ms-1">+</span>
                </button>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm mushaf-ink">وضع التفسير</span>
                <input
                  type="checkbox"
                  checked={tafsirMode}
                  onChange={(e) => setTafsirMode(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>
              <p className="text-[11px] mushaf-gold opacity-80 mt-1">
                عند التفعيل، الضغط على أي آية يعرض تفسيرها بدلاً من تشغيل الصوت.
              </p>

              <div className="mt-4 pt-4 border-t border-[color-mix(in_oklab,var(--mushaf-frame)_30%,transparent)]">
                <label className="block text-xs mushaf-gold mb-2">إجراءات سريعة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowSettings(false); playPage(); }}
                    className="mushaf-pill justify-center text-xs py-2"
                  >
                    {pagePlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>تشغيل الصفحة</span>
                  </button>
                  <button
                    onClick={() => { setShowSettings(false); setShowSearch(true); }}
                    className="mushaf-pill justify-center text-xs py-2"
                  >
                    <Search size={14} />
                    <span>بحث</span>
                  </button>
                  <button
                    onClick={() => { setShowSettings(false); setShowBookmarks(true); }}
                    className="mushaf-pill justify-center text-xs py-2"
                  >
                    <Bookmark size={14} />
                    <span>الإشارات</span>
                  </button>
                  <button
                    onClick={() => { setShowSettings(false); setShowReciters(true); }}
                    className="mushaf-pill justify-center text-xs py-2"
                  >
                    <Mic2 size={14} />
                    <span>القُرّاء</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surah picker */}
      <AnimatePresence>
        {showSurahs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowSurahs(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-[460px] max-h-[80vh] mushaf-sheet rounded-t-3xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold mushaf-ink">فهرس السور</h2>
                <button onClick={() => setShowSurahs(false)} className="text-xs mushaf-gold">إغلاق</button>
              </div>
              {surahs.length === 0 ? (
                <div className="py-10 flex justify-center mushaf-gold">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-1 dawm-stagger">
                  {surahs.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          const target = s.pages?.[0] ?? 1;
                          setDirection(target > page ? 1 : -1);
                          progressService.handleJump(target);
                          setPage(target);
                          setShowSurahs(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mushaf-row-hover text-right dawm-press"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full border text-[11px] flex items-center justify-center mushaf-gold tabular-nums">
                            {toArabic(s.id)}
                          </span>
                          <span className="font-quran text-base mushaf-ink">{s.name_arabic}</span>
                        </span>
                        <span className="text-[10px] mushaf-gold tabular-nums">
                          {s.revelation_place === "makkah" ? "مكية" : "مدنية"} • ص {toArabic(s.pages?.[0] ?? 0)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tafsir bottom sheet */}
      <AnimatePresence>
        {tafsirVerse && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setTafsirVerse(null)}
          >
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-[460px] mushaf-sheet rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs mushaf-gold font-bold">تفسير الآية {tafsirVerse.key}</span>
                <button onClick={() => setTafsirVerse(null)} className="mushaf-gold"><X size={18} /></button>
              </div>
              {tafsirLoading ? (
                <div className="py-8 flex justify-center mushaf-gold"><Loader2 className="animate-spin" size={20} /></div>
              ) : (
                <p className="text-sm mushaf-ink leading-relaxed font-quran">{tafsirVerse.text}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reciters sheet */}
      <AnimatePresence>
        {showReciters && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowReciters(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-[460px] max-h-[70vh] mushaf-sheet rounded-t-3xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold mushaf-ink">القُرّاء</h2>
                <button onClick={() => setShowReciters(false)} className="mushaf-gold"><X size={18} /></button>
              </div>
              <ul className="grid grid-cols-1 gap-1 dawm-stagger">
                {RECITERS.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => { setReciterId(r.id); setShowReciters(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-right dawm-press ${
                        reciterId === r.id ? "mushaf-row-active" : "mushaf-row-hover"
                      }`}
                    >
                      <span className="font-quran text-base mushaf-ink">{r.name}</span>
                      {reciterId === r.id && <span className="text-xs mushaf-gold">المختار</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks sheet */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowBookmarks(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-[460px] max-h-[70vh] mushaf-sheet rounded-t-3xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold mushaf-ink">الإشارات المرجعية</h2>
                <button onClick={() => setShowBookmarks(false)} className="mushaf-gold"><X size={18} /></button>
              </div>
              {bookmarks.length === 0 ? (
                <p className="text-sm mushaf-ink text-center py-8">لا توجد إشارات بعد. اضغط على أيقونة الإشارة لحفظ صفحتك الحالية.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1 dawm-stagger">
                  {bookmarks.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDirection(b.page > page ? 1 : -1);
                          progressService.handleJump(b.page);
                          setPage(b.page);
                          setShowBookmarks(false);
                        }}
                        className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg mushaf-row-hover text-right dawm-press"
                      >
                        <span className="flex items-center gap-2">
                          <Bookmark size={14} className="mushaf-gold" />
                          <span className="font-quran text-base mushaf-ink">صفحة {toArabic(b.page)}</span>
                        </span>
                        <span className="text-[10px] mushaf-gold">{new Date(b.created_at).toLocaleDateString("ar-EG")}</span>
                      </button>
                      <button
                        onClick={async () => {
                          await readingSync.removeBookmark(b.page);
                          setBookmarks((prev) => prev.filter((x) => x.page !== b.page));
                        }}
                        className="mushaf-iconbtn dawm-press"
                        style={{ width: 32, height: 32 }}
                        aria-label="حذف"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search sheet (by surah name or page number) */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-[460px] max-h-[70vh] mushaf-sheet rounded-t-3xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold mushaf-ink">بحث</h2>
                <button onClick={() => setShowSearch(false)} className="mushaf-gold"><X size={18} /></button>
              </div>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اسم السورة أو رقم الصفحة..."
                className="w-full mushaf-input rounded-md p-2 text-sm mushaf-ink mb-3"
              />
              {(() => {
                const q = searchQuery.trim();
                const asNum = parseInt(q, 10);
                if (!isNaN(asNum) && asNum >= 1 && asNum <= TOTAL_QURAN_PAGES) {
                  return (
                    <button
                      onClick={() => {
                        setDirection(asNum > page ? 1 : -1);
                        progressService.handleJump(asNum);
                        setPage(asNum);
                        setShowSearch(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-lg mushaf-row-active text-right dawm-press mushaf-ink"
                    >
                      اذهب إلى صفحة {toArabic(asNum)}
                    </button>
                  );
                }
                if (!q) return <p className="text-xs mushaf-gold text-center py-4">اكتب اسم السورة أو رقم الصفحة (1 - {toArabic(TOTAL_QURAN_PAGES)}).</p>;
                const matches = surahs.filter((s) => s.name_arabic.includes(q));
                if (matches.length === 0) return <p className="text-xs mushaf-gold text-center py-4">لا نتائج.</p>;
                return (
                  <ul className="grid grid-cols-1 gap-1 dawm-stagger">
                    {matches.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            const target = s.pages?.[0] ?? 1;
                            setDirection(target > page ? 1 : -1);
                            progressService.handleJump(target);
                            setPage(target);
                            setShowSearch(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mushaf-row-hover text-right dawm-press"
                        >
                          <span className="font-quran text-base mushaf-ink">{s.name_arabic}</span>
                          <span className="text-[10px] mushaf-gold">ص {toArabic(s.pages?.[0] ?? 0)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Jump to page popup */}
      <AnimatePresence>
        {showJump && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowJump(false)}
          >
            <motion.div
              dir="rtl"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-xs mushaf-modal rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold mushaf-ink">الانتقال إلى صفحة</h2>
                <button onClick={() => setShowJump(false)} className="mushaf-gold"><X size={18} /></button>
              </div>
              <p className="text-[11px] mushaf-gold mb-2 opacity-80">
                أدخل رقم الصفحة (1 - {toArabic(TOTAL_QURAN_PAGES)})
              </p>
              <input
                autoFocus
                inputMode="numeric"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(jumpInput, 10);
                    if (!isNaN(n) && n >= 1 && n <= TOTAL_QURAN_PAGES) {
                      setDirection(n > page ? 1 : -1);
                      progressService.handleJump(n);
                      setPage(n);
                      setShowJump(false);
                    }
                  }
                }}
                placeholder="مثال: 50"
                className="w-full mushaf-input rounded-xl p-3 text-center text-lg font-quran tabular-nums mb-3"
              />
              <button
                onClick={() => {
                  const n = parseInt(jumpInput, 10);
                  if (!isNaN(n) && n >= 1 && n <= TOTAL_QURAN_PAGES) {
                    setDirection(n > page ? 1 : -1);
                    progressService.handleJump(n);
                    setPage(n);
                    setShowJump(false);
                  }
                }}
                className="w-full mushaf-pill justify-center py-3 font-bold"
              >
                انتقال
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
