"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { DashboardSummary, DailyLog, Sale, Expense, HealthEvent, User, RecentEntry } from "@/types";
import { formatETB, formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid,
} from "recharts";
import { AlertTriangle, Egg, DollarSign, Bird, Activity, Loader2, Plus, KeyRound, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/ui/kpi-card";

export default function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<(DashboardSummary & { today_log_submitted?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);

  // States for detailed dashboard lists (owner only)
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [health, setHealth] = useState<HealthEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterType, setFilterType] = useState<"all" | "sale" | "expense" | "log" | "health">("all");

  // Reset password modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const isOwner = user?.role === "owner";

  function fetchDashboardData() {
    api.get<DashboardSummary & { today_log_submitted?: boolean }>("/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function fetchOwnerTableData() {
    if (!isOwner) return;
    Promise.all([
      api.get<DailyLog[]>("/daily-logs").catch(() => []),
      api.get<Sale[]>("/sales").catch(() => []),
      api.get<Expense[]>("/expenses").catch(() => []),
      api.get<HealthEvent[]>("/health").catch(() => []),
      api.get<User[]>("/users").catch(() => []),
    ]).then(([logsData, salesData, expensesData, healthData, usersData]) => {
      setLogs(logsData);
      setSales(salesData);
      setExpenses(expensesData);
      setHealth(healthData);
      setUsers(usersData);
    }).catch(console.error);
  }

  useEffect(() => {
    fetchDashboardData();
    fetchOwnerTableData();
  }, [user]);

  // Construct audit feed (All recent entries) from complete datasets
  const allRecentEntries = useMemo(() => {
    if (!isOwner) return data?.recent_entries ?? [];
    
    const entries: RecentEntry[] = [];
    logs.forEach((l) => {
      entries.push({
        id: l.id,
        type: "log",
        description: `${l.eggs_collected} eggs collected`,
        recorded_by_name: l.logged_by_name ?? "Employee",
        date: l.log_date,
      });
    });
    sales.forEach((s) => {
      entries.push({
        id: s.id,
        type: "sale",
        description: `${s.quantity} ${s.type === "eggs" ? "trays" : "birds"} sold`,
        amount: Number(s.amount_etb),
        recorded_by_name: s.recorded_by_name ?? "Employee",
        date: s.sale_date,
      });
    });
    expenses.forEach((e) => {
      entries.push({
        id: e.id,
        type: "expense",
        description: `${t(e.category, language)}: ${e.supplier || "Farm purchase"}`,
        amount: Number(e.amount_etb),
        recorded_by_name: e.recorded_by_name ?? "Employee",
        date: e.expense_date,
      });
    });
    health.forEach((h) => {
      entries.push({
        id: h.id,
        type: "health",
        description: `${t(h.event_type, language)}: ${h.details}`,
        recorded_by_name: h.recorded_by_name ?? "Employee",
        date: h.event_date,
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, sales, expenses, health, isOwner, data]);

  // Filter recent entries client-side
  const filteredRecentEntries = useMemo(() => {
    const list = allRecentEntries;
    if (filterType === "all") return list.slice(0, 15);
    return list.filter((e) => e.type === filterType).slice(0, 15);
  }, [allRecentEntries, filterType]);

  // Stat calculations
  const totalEggsThisWeek = useMemo(() => {
    return data?.last_7_days_eggs.reduce((sum, d) => sum + d.count, 0) ?? 0;
  }, [data]);

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const salesThisMonthCount = useMemo(() => {
    return sales.filter((s) => s.sale_date.startsWith(currentMonthStr)).length;
  }, [sales, currentMonthStr]);

  const expensesThisMonthCount = useMemo(() => {
    return expenses.filter((e) => e.expense_date.startsWith(currentMonthStr)).length;
  }, [expenses, currentMonthStr]);

  async function onDeleteEntry(id: string, type: "sale" | "expense" | "log" | "health") {
    const endpointMap = {
      sale: `/sales/${id}`,
      expense: `/expenses/${id}`,
      log: `/daily-logs/${id}`,
      health: `/health/${id}`,
    };
    const url = endpointMap[type];
    if (!url) return;

    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      await api.delete(url);
      fetchDashboardData();
      fetchOwnerTableData();
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setResetting(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      alert(`Password for ${selectedUser.full_name} has been reset.`);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  const avgEggs = useMemo(() => {
    const points = data?.last_7_days_eggs ?? [];
    if (points.length === 0) return 0;
    const sum = points.reduce((acc, p) => acc + p.count, 0);
    return Math.round(sum / points.length);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const eggChange = data ? data.eggs_today - data.eggs_yesterday : 0;
  const netMonth = data ? data.revenue_month - data.expenses_month : 0;

  const dateString = new Date().toLocaleDateString("en-ET", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 pt-2 md:pt-4">
      {/* Page Header */}
      <PageHeader title={t("Dashboard", language)} subtitle={dateString} />

      {/* Log submission banner */}
      {data && (
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2 rounded-lg text-xs border font-medium transition-colors",
            data.today_log_submitted
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {data.today_log_submitted ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{t("Today's log submitted", language)}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{t("Today's log not submitted yet", language)}</span>
              </>
            )}
          </div>
          {!data.today_log_submitted && (
            <Link href="/daily-log">
              <span className="text-amber-700 dark:text-amber-400 hover:underline font-bold shrink-0 ml-2">
                {t("Submit now", language)} →
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Grid structure depending on role */}
      {isOwner ? (
        <OwnerDashboardView
          data={data}
          eggChange={eggChange}
          netMonth={netMonth}
          avgEggs={avgEggs}
          totalEggsThisWeek={totalEggsThisWeek}
          salesThisMonthCount={salesThisMonthCount}
          expensesThisMonthCount={expensesThisMonthCount}
          recentEntries={data?.recent_entries ?? []}
          allRecentEntries={allRecentEntries}
          filteredRecentEntries={filteredRecentEntries}
          filterType={filterType}
          setFilterType={setFilterType}
          onDeleteEntry={onDeleteEntry}
          users={users}
          setSelectedUser={setSelectedUser}
          language={language}
        />
      ) : (
        <EmployeeDashboardView
          data={data}
          eggChange={eggChange}
          netMonth={netMonth}
          language={language}
        />
      )}

      {/* Reset Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Reset password</h3>
              <p className="text-sm text-muted-foreground">
                Set a new password for <span className="font-semibold">{selectedUser.full_name}</span>.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={resetting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetting}>
                  {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact KPI Card local helper component
interface CompactKpiCardProps {
  label: string;
  value: string | number;
  trendText?: string;
  trendValue?: number;
  icon?: any;
  color?: "revenue" | "expense" | "default";
}

function CompactKpiCard({ label, value, trendText, trendValue, icon: Icon, color = "default" }: CompactKpiCardProps) {
  return (
    <Card className="h-[72px] p-4 flex flex-col justify-between rounded-xl border-border bg-card shadow-sm overflow-hidden select-none">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />}
      </div>
      <div className="flex items-baseline justify-between mt-0.5">
        <span className="font-serif italic text-2xl leading-none font-bold text-foreground">
          {value}
        </span>
        {trendText && (
          <span
            className={cn(
              "text-[10px] font-medium leading-none self-end",
              color === "expense"
                ? "text-[hsl(var(--expense))]"
                : trendValue && trendValue > 0
                ? "text-[hsl(var(--revenue))]"
                : trendValue && trendValue < 0
                ? "text-[hsl(var(--expense))]"
                : "text-muted-foreground"
            )}
          >
            {trendValue && trendValue > 0 ? "↑ " : trendValue && trendValue < 0 ? "↓ " : ""}
            {trendText}
          </span>
        )}
      </div>
    </Card>
  );
}

// Helper to determine badge color by user/employee initials
function getRoleBadgeColor(name: string) {
  const norm = name.toLowerCase();
  if (norm.includes("owner")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (norm.includes("abebe") || norm.charCodeAt(0) % 2 === 0) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
}

// 1. OWNER DASHBOARD VIEW
interface OwnerViewProps {
  data: any;
  eggChange: number;
  netMonth: number;
  avgEggs: number;
  totalEggsThisWeek: number;
  salesThisMonthCount: number;
  expensesThisMonthCount: number;
  recentEntries: RecentEntry[];
  allRecentEntries: RecentEntry[];
  filteredRecentEntries: RecentEntry[];
  filterType: string;
  setFilterType: (t: any) => void;
  onDeleteEntry: (id: string, type: any) => void;
  users: User[];
  setSelectedUser: (u: User) => void;
  language: "en" | "am";
}

function OwnerDashboardView({
  data,
  eggChange,
  netMonth,
  avgEggs,
  totalEggsThisWeek,
  salesThisMonthCount,
  expensesThisMonthCount,
  recentEntries,
  allRecentEntries,
  filteredRecentEntries,
  filterType,
  setFilterType,
  onDeleteEntry,
  users,
  setSelectedUser,
  language,
}: OwnerViewProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CompactKpiCard
          label={t("Eggs today", language)}
          value={data?.eggs_today ?? 0}
          trendText={`${Math.abs(eggChange)} ${t("vs yesterday", language)}`}
          trendValue={eggChange}
          icon={Egg}
        />
        <CompactKpiCard
          label={t("Revenue", language)}
          value={formatETB(data?.revenue_month ?? 0)}
          trendText={`${formatETB(Math.abs(netMonth))} Net`}
          trendValue={netMonth}
          icon={DollarSign}
        />
        <CompactKpiCard
          label={t("Expenses", language)}
          value={formatETB(data?.expenses_month ?? 0)}
          trendText={t("This month", language)}
          color="expense"
          icon={Activity}
        />
        <CompactKpiCard
          label={t("Active flock", language)}
          value={data?.active_chickens ?? 200}
          trendText={`${data?.deaths_month ?? 0} deaths`}
          trendValue={-(data?.deaths_month ?? 0)}
          icon={Bird}
        />
      </div>

      {/* Row 2: Chart + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        {/* Left: 7-day Egg Chart */}
        <Card className="lg:col-span-3 rounded-xl border-border bg-card shadow-sm p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
              {t("7-day egg production", language)}
            </h4>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.last_7_days_eggs ?? []} barSize={24}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => {
                    try {
                      return new Date(d).toLocaleDateString("en-ET", { weekday: "short" });
                    } catch (e) {
                      return d;
                    }
                  }}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [v, t("eggs", language)]}
                  labelFormatter={(d) => formatDate(d)}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <ReferenceLine y={avgEggs} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.4} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} minPointSize={3}>
                  {(data?.last_7_days_eggs ?? []).map((entry: any, i: number, arr: any[]) => (
                    <Cell
                      key={i}
                      fill={i === arr.length - 1 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Chart Legend */}
            <div className="flex justify-end items-center gap-4 text-[10px] text-muted-foreground mt-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted" />
                <span>Previous days</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Quick Stats Strip + Recent Entries */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg px-2.5 py-1.5 flex flex-col justify-between border border-border/40">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Eggs Week</span>
              <span className="text-xs font-extrabold text-foreground mt-1 leading-none">{totalEggsThisWeek}</span>
            </div>
            <div className="bg-muted/50 rounded-lg px-2.5 py-1.5 flex flex-col justify-between border border-border/40">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Sales Month</span>
              <span className="text-xs font-extrabold text-foreground mt-1 leading-none">{salesThisMonthCount}</span>
            </div>
            <div className="bg-muted/50 rounded-lg px-2.5 py-1.5 flex flex-col justify-between border border-border/40">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Exp. Entries</span>
              <span className="text-xs font-extrabold text-foreground mt-1 leading-none">{expensesThisMonthCount}</span>
            </div>
          </div>

          {/* Recent entries list */}
          <Card className="rounded-xl border-border bg-card shadow-sm p-4 flex-1 flex flex-col justify-between min-h-[196px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {t("Your recent entries", language)}
              </h4>
              <Link href="/daily-log" className="text-[10px] font-bold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="flex-1 divide-y divide-border/60 overflow-y-auto">
              {recentEntries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{entry.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("text-[9px] px-1 py-0.2 rounded-full font-bold", getRoleBadgeColor(entry.recorded_by_name))}>
                        {entry.recorded_by_name.split(" ")[0]}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{formatDate(entry.date)}</span>
                    </div>
                  </div>
                  {entry.amount !== undefined ? (
                    <span
                      className={cn(
                        "text-xs font-bold shrink-0",
                        entry.type === "sale" ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"
                      )}
                    >
                      {entry.type === "sale" ? "+" : "−"}
                      {formatETB(entry.amount)}
                    </span>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-[8px] px-1 py-0 font-bold bg-muted text-muted-foreground border-none">
                      {t(entry.type, language)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Farm Activity Feed (Full-Width, Owner Only) */}
      <Card className="rounded-xl border-border bg-card shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Farm activity
          </h4>
          <div className="flex flex-wrap gap-1">
            {(["all", "sale", "expense", "log", "health"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-colors border",
                  filterType === type
                    ? "bg-primary text-white border-primary"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                )}
              >
                {type === "log" ? "Logs" : type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-muted/50 border-b border-border/85">
              <tr className="h-8">
                <th className="p-2 pl-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[80px]">Date</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[180px] sm:w-auto">Description</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[70px]">Type</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[90px]">Recorded</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide text-right w-[90px]">Amount</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide text-center w-[50px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecentEntries.length === 0 ? (
                <tr className="h-10">
                  <td colSpan={6} className="p-2 text-center text-xs text-muted-foreground italic">
                    No entries found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredRecentEntries.map((entry) => (
                  <tr key={entry.id} className="h-10 text-xs hover:bg-accent/40 group transition-colors odd:bg-background even:bg-muted/20">
                    <td className="p-2 pl-3 text-muted-foreground whitespace-nowrap">{formatDate(entry.date).slice(0, 6)}</td>
                    <td className="p-2 font-medium text-foreground truncate pr-4">{entry.description}</td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 leading-none font-bold border-none rounded-full select-none capitalize",
                          entry.type === "log" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          entry.type === "sale" && "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
                          entry.type === "expense" && "bg-rose-500/10 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
                          entry.type === "health" && "bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                        )}
                      >
                        {entry.type === "log" ? "Log" : entry.type}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium text-muted-foreground truncate">{entry.recorded_by_name}</td>
                    <td
                      className={cn(
                        "p-2 text-right font-semibold tabular-nums",
                        entry.amount !== undefined
                          ? entry.type === "sale"
                            ? "text-[hsl(var(--revenue))]"
                            : "text-[hsl(var(--expense))]"
                          : "text-muted-foreground"
                      )}
                    >
                      {entry.amount !== undefined ? (entry.type === "sale" ? "+" : "−") + formatETB(entry.amount) : "—"}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onDeleteEntry(entry.id, entry.type)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-150 p-1 rounded hover:bg-muted/80"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 4: Farm Accounts (Full-Width, Owner Only) */}
      <Card className="rounded-xl border-border bg-card shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Farm accounts
          </h4>
          <Link href="/users">
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold gap-1 rounded-lg border-border hover:bg-muted">
              <Plus className="w-3 h-3" />
              Add user
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-muted/50 border-b border-border/85">
              <tr className="h-8">
                <th className="p-2 pl-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[180px] sm:w-auto">Name</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[90px]">Role</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[180px]">Email</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide w-[100px]">Joined</th>
                <th className="p-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wide text-right w-[130px] pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const initials = u.full_name.slice(0, 2).toUpperCase();
                const joinedDate = (() => {
                  try {
                    return new Date(u.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  } catch (e) {
                    return "Jan 2026";
                  }
                })();

                return (
                  <tr key={u.id} className="h-10 text-xs hover:bg-accent/40 transition-colors odd:bg-background even:bg-muted/20">
                    <td className="p-2 pl-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 select-none",
                            u.role === "owner" ? "bg-emerald-600" : "bg-blue-600"
                          )}
                        >
                          {initials}
                        </div>
                        <span className="font-semibold text-foreground truncate">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      {u.role === "owner" ? (
                        <Badge className="text-[9px] py-0 px-2 leading-none font-bold bg-primary text-white border-none rounded-full">
                          Owner
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] py-0 px-2 leading-none font-bold text-muted-foreground border-border rounded-full bg-transparent">
                          Employee
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground truncate">{u.email}</td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">{joinedDate}</td>
                    <td className="p-2 text-right pr-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(u)}
                        className="h-6 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1 rounded"
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        Reset password
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// 2. EMPLOYEE DASHBOARD VIEW
interface EmployeeViewProps {
  data: any;
  eggChange: number;
  netMonth: number;
  language: "en" | "am";
}

function EmployeeDashboardView({ data, eggChange, netMonth, language }: EmployeeViewProps) {
  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("Eggs today", language)}
          value={data?.eggs_today ?? 0}
          trend={{ value: eggChange, label: ` ${t("vs yesterday", language)}` }}
          icon={Egg}
          stagger={1}
        />
        <KpiCard
          label={t("Revenue", language)}
          value={formatETB(data?.revenue_month ?? 0)}
          trend={{ value: netMonth, label: ` ${t("Net", language)}` }}
          color="revenue"
          icon={DollarSign}
          stagger={2}
        />
        <KpiCard
          label={t("Expenses", language)}
          value={formatETB(data?.expenses_month ?? 0)}
          description={t("This month", language)}
          color="expense"
          icon={Activity}
          stagger={3}
        />
        <KpiCard
          label={t("Active flock", language)}
          value={data?.active_chickens ?? 200}
          description={`${data?.deaths_month ?? 0} ${t("deaths this month", language)}`}
          icon={Bird}
          stagger={4}
        />
      </div>

      {/* Charts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
        {/* Egg production chart */}
        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">{t("7-day egg production", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.last_7_days_eggs ?? []} barSize={28}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => {
                    try {
                      return new Date(d).toLocaleDateString("en-ET", { weekday: "short" });
                    } catch (e) {
                      return d;
                    }
                  }}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [v, t("eggs", language)]}
                  labelFormatter={(d) => formatDate(d)}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(data?.last_7_days_eggs ?? []).map((entry: any, i: number, arr: any[]) => (
                    <Cell key={i} fill={i === arr.length - 1 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent entries */}
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">{t("Your recent entries", language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {(data?.recent_entries ?? []).slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.recorded_by_name} · {formatDate(entry.date)}</p>
                </div>
                {entry.amount !== undefined ? (
                  <span className={`text-sm font-semibold shrink-0 ${entry.type === "sale" ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"}`}>
                    {entry.type === "sale" ? "+" : "−"}{formatETB(entry.amount)}
                  </span>
                ) : (
                  <Badge variant="secondary" className="shrink-0 text-[10px] px-2 py-0.5 font-medium rounded-full bg-muted text-muted-foreground border-none">{t(entry.type, language)}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
