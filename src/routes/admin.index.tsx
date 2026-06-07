import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, TrendingUp, TrendingDown, Activity, Zap, Award } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: CommandCenter,
});

interface Kpi {
  totalUsers: number;
  activeToday: number;
  pagesReadToday: number;
  wirdToday: number;
  totalPoints: number;
  completedToday: number;
  liveUsers: number;
  growth: { active: number; pages: number; wird: number };
  chart: Array<{ date: string; pages: number; wird: number }>;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchKpis(): Promise<Kpi> {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60_000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 3600_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const fourteenDaysAgoStart = new Date(now.getTime() - 14 * 24 * 3600_000);

  const [
    usersRes,
    activeTodayRes,
    pagesTodayRes,
    wirdTodayRes,
    liveRes,
    activeLast7Res,
    activePrev7Res,
    pagesLast7Res,
    pagesPrev7Res,
    wirdLast7Res,
    wirdPrev7Res,
    pagesChartRes,
    wirdChartRes,
    pointsRes,
    completedTodayRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("analytics_events").select("user_id", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "page_counted_120s").gte("created_at", todayIso),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "wird_completed").gte("created_at", todayIso),
    supabase.from("analytics_events").select("user_id", { count: "exact", head: true }).gte("created_at", fiveMinAgo),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgoStart.toISOString()).lt("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "page_counted_120s").gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "page_counted_120s").gte("created_at", fourteenDaysAgoStart.toISOString()).lt("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "wird_completed").gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "wird_completed").gte("created_at", fourteenDaysAgoStart.toISOString()).lt("created_at", sevenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("created_at").eq("event_name", "page_counted_120s").gte("created_at", fourteenDaysAgo.toISOString()),
    supabase.from("analytics_events").select("created_at").eq("event_name", "wird_completed").gte("created_at", fourteenDaysAgo.toISOString()),
    supabase.from("user_daily_progress").select("points").gte("date", isoDay(fourteenDaysAgo)),
    supabase.from("user_daily_progress").select("completion_pct").eq("date", isoDay(now)).gte("completion_pct", 100),
  ]);

  // Build 14-day series
  const series: Record<string, { pages: number; wird: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600_000);
    series[isoDay(d)] = { pages: 0, wird: 0 };
  }
  (pagesChartRes.data || []).forEach((r: any) => {
    const k = isoDay(new Date(r.created_at));
    if (series[k]) series[k].pages++;
  });
  (wirdChartRes.data || []).forEach((r: any) => {
    const k = isoDay(new Date(r.created_at));
    if (series[k]) series[k].wird++;
  });
  const chart = Object.entries(series).map(([date, v]) => ({
    date: date.slice(5),
    pages: v.pages,
    wird: v.wird,
  }));

  const totalPoints = (pointsRes.data || []).reduce((s: number, r: any) => s + (r.points || 0), 0);

  const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));

  return {
    totalUsers: usersRes.count ?? 0,
    activeToday: activeTodayRes.count ?? 0,
    pagesReadToday: pagesTodayRes.count ?? 0,
    wirdToday: wirdTodayRes.count ?? 0,
    totalPoints,
    completedToday: (completedTodayRes.data || []).length,
    liveUsers: liveRes.count ?? 0,
    growth: {
      active: pct(activeLast7Res.count ?? 0, activePrev7Res.count ?? 0),
      pages: pct(pagesLast7Res.count ?? 0, pagesPrev7Res.count ?? 0),
      wird: pct(wirdLast7Res.count ?? 0, wirdPrev7Res.count ?? 0),
    },
    chart,
  };
}

function CommandCenter() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetchKpis();
        if (!cancelled) {
          setKpi(data);
          setLive(data.liveUsers);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    const interval = setInterval(async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      const { count } = await supabase
        .from("analytics_events")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", fiveMinAgo);
      if (!cancelled) setLive(count ?? 0);
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header + live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">مركز القيادة</h2>
          <p className="text-sm text-muted-foreground">لوحة المتابعة الفورية لنشاط دَاوِمْ.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {live} نشط الآن
          </span>
        </div>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Award size={18} />}
          label="إجمالي النقاط (14 يوم)"
          value={kpi?.totalPoints}
          loading={loading}
          accent="primary"
        />
        <KpiCard
          icon={<Zap size={18} />}
          label="أوراد مكتملة اليوم"
          value={kpi?.completedToday}
          loading={loading}
          accent="primary"
        />
        <KpiCard
          icon={<Activity size={18} />}
          label="نشطون اليوم"
          value={kpi?.activeToday}
          growth={kpi?.growth.active}
          loading={loading}
        />
        <KpiCard
          icon={<BookOpen size={18} />}
          label="صفحات مقروءة اليوم"
          value={kpi?.pagesReadToday}
          growth={kpi?.growth.pages}
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard icon={<Users size={18} />} label="إجمالي المستخدمين" value={kpi?.totalUsers} loading={loading} />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="ورد مكتمل اليوم"
          value={kpi?.wirdToday}
          growth={kpi?.growth.wird}
          loading={loading}
        />
        <KpiCard
          icon={<Activity size={18} />}
          label="نشط الآن"
          value={live}
          loading={loading}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">صفحات القرآن المقروءة</h3>
            <p className="text-xs text-muted-foreground">آخر 14 يوماً</p>
          </div>
          <span className="text-xs text-muted-foreground">تحديث تلقائي</span>
        </div>
        <div className="h-72">
          {loading || !kpi ? (
            <div className="h-full w-full bg-muted/30 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pages"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gPages)"
                  name="صفحات"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  loading,
  growth,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | undefined;
  loading: boolean;
  growth?: number;
  accent?: "primary";
}) {
  const positive = (growth ?? 0) >= 0;
  return (
    <div
      className={`rounded-2xl border bg-card p-4 ${accent === "primary" ? "border-primary/30 bg-primary/5" : "border-border"}`}
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent === "primary" ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        {growth !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {positive ? "+" : ""}
            {growth}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums">
        {loading ? "…" : (value ?? 0).toLocaleString("ar-EG")}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {growth !== undefined && !loading && (
        <div className="text-[10px] text-muted-foreground mt-1">مقارنة بالأسبوع الماضي</div>
      )}
    </div>
  );
}
