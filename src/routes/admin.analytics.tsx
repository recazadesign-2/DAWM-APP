import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

interface DayRow {
  date: string;
  pages: number;
  active: number;
  wird: number;
}

function AnalyticsPage() {
  const [data, setData] = useState<DayRow[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0,0,0,0);
      const { data: events } = await supabase
        .from("analytics_events")
        .select("event_name,user_id,created_at")
        .gte("created_at", since.toISOString());

      const byDay = new Map<string, { pages: Set<string>; active: Set<string>; wird: number; pagesCount: number }>();
      const byEvent = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(since); d.setDate(since.getDate() + i);
        byDay.set(d.toISOString().slice(0,10), { pages: new Set(), active: new Set(), wird: 0, pagesCount: 0 });
      }
      (events ?? []).forEach((e: any) => {
        const day = (e.created_at as string).slice(0,10);
        const slot = byDay.get(day); if (!slot) return;
        if (e.user_id) slot.active.add(e.user_id);
        if (e.event_name === "page_counted_120s") slot.pagesCount += 1;
        if (e.event_name === "wird_completed") slot.wird += 1;
        byEvent.set(e.event_name, (byEvent.get(e.event_name) ?? 0) + 1);
      });
      const rows: DayRow[] = Array.from(byDay.entries()).map(([date, s]) => ({
        date: date.slice(5),
        pages: s.pagesCount,
        active: s.active.size,
        wird: s.wird,
      }));
      setData(rows);
      setEventBreakdown(Array.from(byEvent.entries()).map(([name, value]) => ({ name, value })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">الإحصائيات</h2>
      <p className="text-sm text-muted-foreground mb-6">آخر 14 يوماً — بيانات مجمّعة، بدون كشف هويات فردية.</p>

      <div className="grid gap-6">
        <ChartCard title="الصفحات المقروءة + المستخدمون النشطون يومياً">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="pages" name="صفحات" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="active" name="نشطون" stroke="hsl(var(--accent, var(--primary)))" strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="الأوراد المكتملة يومياً">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="wird" name="ورد مكتمل" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="الأحداث (إجمالي 14 يوم)">
          {eventBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">لا توجد أحداث بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eventBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={150} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" name="عدد" fill="hsl(var(--primary))" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}