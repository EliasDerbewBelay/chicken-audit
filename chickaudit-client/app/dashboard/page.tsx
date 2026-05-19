"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardSummary } from "@/types";
import { formatETB, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Egg, DollarSign, Bird, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";

export default function DashboardPage() {
  const [data, setData] = useState<(DashboardSummary & { today_log_submitted?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    api.get<DashboardSummary & { today_log_submitted?: boolean }>("/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const eggChange = data ? data.eggs_today - data.eggs_yesterday : 0;
  const netMonth = data ? data.revenue_month - data.expenses_month : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display text-foreground">{t("Dashboard", language)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-ET", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Warning banner for daily log submission */}
      {data && !data.today_log_submitted && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold">{t("Today's log not submitted yet", language)}</p>
              <p className="text-xs opacity-90">{t("Please record the feed given, eggs collected, and deaths for today to keep data accurate.", language)}</p>
            </div>
          </div>
          <Link href="/daily-log" className="w-full sm:w-auto shrink-0">
            <Button size="sm" variant="outline" className="w-full border-amber-500/30 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200">
              {t("Submit now", language)}
            </Button>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-fade-in stagger-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("Eggs today", language)}</span>
              <Egg className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-display text-foreground">{data?.eggs_today ?? 0}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {eggChange >= 0
                ? <TrendingUp className="w-3 h-3 text-[hsl(var(--revenue))]" />
                : <TrendingDown className="w-3 h-3 text-[hsl(var(--expense))]" />}
              <span className={`text-xs ${eggChange >= 0 ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"}`}>
                {eggChange >= 0 ? "+" : ""}{eggChange} {t("vs yesterday", language)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in stagger-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("Revenue", language)}</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-display text-[hsl(var(--revenue))]">{formatETB(data?.revenue_month ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("Net", language)}: <span className={netMonth >= 0 ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"}>{formatETB(netMonth)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in stagger-3">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("Expenses", language)}</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-display text-[hsl(var(--expense))]">{formatETB(data?.expenses_month ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{t("This month", language)}</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in stagger-4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("Active flock", language)}</span>
              <Bird className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-display text-foreground">{data?.active_chickens ?? 200}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{data?.deaths_month ?? 0} {t("deaths this month", language)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Egg production chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("7-day egg production", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.last_7_days_eggs ?? []} barSize={28}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en-ET", { weekday: "short" })}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [v, t("eggs", language)]}
                  labelFormatter={(d) => formatDate(d)}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(data?.last_7_days_eggs ?? []).map((entry, i, arr) => (
                    <Cell key={i} fill={i === arr.length - 1 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent entries */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("Your recent entries", language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {(data?.recent_entries ?? []).slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">{entry.recorded_by_name} · {formatDate(entry.date)}</p>
                </div>
                {entry.amount !== undefined ? (
                  <span className={`text-sm font-medium shrink-0 ${entry.type === "sale" ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"}`}>
                    {entry.type === "sale" ? "+" : "−"}{formatETB(entry.amount)}
                  </span>
                ) : (
                  <Badge variant="secondary" className="shrink-0 text-xs">{t(entry.type, language)}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
