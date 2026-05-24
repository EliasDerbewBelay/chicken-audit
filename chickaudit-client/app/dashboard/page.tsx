"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { DashboardSummary, DailyLog, Sale, Expense, HealthEvent, User, RecentEntry } from "@/types";
import { formatETB, formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EggProductionChart } from "@/components/dashboard/egg-production-chart";
import { AlertTriangle, Egg, DollarSign, Bird, Activity, Loader2, Plus, KeyRound, Trash2, ShieldAlert, MoreHorizontal, ChevronDown, Eye, Edit2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { useToast } from "@/components/ui/toaster";

export default function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState<(DashboardSummary & { today_log_submitted?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);

  // States for detailed dashboard lists (owner only)
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [health, setHealth] = useState<HealthEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterType, setFilterType] = useState<"all" | "sale" | "expense" | "log" | "health">("all");
  const [viewingEntry, setViewingEntry] = useState<RecentEntry | null>(null);
  const router = useRouter();

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
        description: `${l.eggs_collected} ${t("eggs collected", language)}`,
        recorded_by_name: l.logged_by_name ?? "Employee",
        date: l.log_date,
      });
    });
    sales.forEach((s) => {
      entries.push({
        id: s.id,
        type: "sale",
        description: `${s.quantity} ${s.type === "eggs" ? t("trays", language) : t("birds", language)} ${t("sold", language)}`,
        amount: Number(s.amount_etb),
        recorded_by_name: s.recorded_by_name ?? "Employee",
        date: s.sale_date,
      });
    });
    expenses.forEach((e) => {
      entries.push({
        id: e.id,
        type: "expense",
        description: `${t(e.category, language)}: ${e.supplier || t("Farm purchase", language)}`,
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
    return data?.last_7_days_eggs?.reduce((sum, d) => sum + d.count, 0) ?? 0;
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
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
      return;
    }

    setResetting(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      toast({ title: "Password updated", description: `Password for ${selectedUser.full_name} has been reset.` });
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to reset password", description: err.message || "Failed to reset password" });
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

  const dateString = new Date().toLocaleDateString(language === "am" ? "am-ET" : "en-ET", {
    calendar: language === "am" ? "ethiopic" : undefined,
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
          setViewingEntry={setViewingEntry}
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

      {/* Reset Password Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setNewPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Reset password", language)}</DialogTitle>
            <DialogDescription>
              {t("Set a new password for", language)} <span className="font-semibold">{selectedUser?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new_password">{t("New Password", language)}</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("Min 6 characters", language)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">{t("Confirm New Password", language)}</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("Verify password", language)}
                required
              />
            </div>
            <DialogFooter>
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
                {t("Cancel", language)}
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Save password", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Entry Details", language)}</DialogTitle>
            <DialogDescription>{t("Overview of this record.", language)}</DialogDescription>
          </DialogHeader>
          {viewingEntry && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Date", language)}</span>
                <span className="text-sm font-medium">{formatDate(viewingEntry.date, language)}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Type", language)}</span>
                <span className="text-sm font-medium capitalize">
                  <Badge variant="outline">{t(viewingEntry.type === 'log' ? 'Log' : viewingEntry.type, language)}</Badge>
                </span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Description", language)}</span>
                <span className="text-sm font-medium whitespace-pre-wrap">{viewingEntry.description}</span>
              </div>
              {viewingEntry.amount !== undefined && viewingEntry.amount !== null && (
                <div className="grid grid-cols-2 py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t("Amount (ETB)", language)}</span>
                  <span className={cn(
                    "text-sm font-bold",
                    viewingEntry.type === 'sale' ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"
                  )}>
                    {viewingEntry.type === 'sale' ? '+' : '-'} {formatETB(viewingEntry.amount)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Recorded by", language)}</span>
                <span className="text-sm font-medium">{viewingEntry.recorded_by_name || t("System", language)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  // Determine icon color based on label or color prop
  let iconColorClass = "text-muted-foreground bg-muted/20";
  if (label.toLowerCase().includes("eggs") || label.toLowerCase().includes("revenue")) {
    iconColorClass = "text-[hsl(var(--revenue))] bg-[hsl(var(--revenue))]/10 border border-[hsl(var(--revenue))]/20";
  } else if (label.toLowerCase().includes("expense")) {
    iconColorClass = "text-[hsl(var(--expense))] bg-[hsl(var(--expense))]/10 border border-[hsl(var(--expense))]/20";
  } else if (label.toLowerCase().includes("flock")) {
    iconColorClass = "text-blue-500 bg-blue-500/10 border border-blue-500/20";
  }

  return (
    <Card className="min-h-[140px] p-5 flex flex-col justify-between rounded-xl border-border bg-card shadow-sm overflow-hidden select-none">
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mt-1">{label}</span>
        {Icon && (
          <div className={cn("p-2 rounded-full", iconColorClass)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <span className="font-serif text-3xl md:text-4xl leading-none font-bold text-foreground">
          {value}
        </span>
        {trendText && (
          <span
            className={cn(
              "text-xs font-medium leading-none flex items-center gap-1",
              color === "expense"
                ? "text-[hsl(var(--expense))]"
                : trendValue && trendValue > 0
                ? "text-[hsl(var(--revenue))]"
                : trendValue && trendValue < 0
                ? "text-[hsl(var(--expense))]"
                : "text-muted-foreground"
            )}
          >
            {trendValue && trendValue > 0 ? "↗ " : trendValue && trendValue < 0 ? "↘ " : ""}
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

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
]
function avatarColor(name: string) {
  const i = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

function formatEntryDescription(entry: RecentEntry, language: "en" | "am"): string {
  switch (entry.type) {
    case 'sale':
      return entry.description;
    case 'expense':
      const cat = entry.description.charAt(0).toUpperCase() + entry.description.slice(1);
      return language === "am" ? `${cat} ግዢ` : `${cat} purchase`;
    case 'log':
      return entry.description;
    case 'health':
      return entry.description.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    default:
      return entry.description;
  }
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
  setViewingEntry: (entry: RecentEntry) => void;
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
  setViewingEntry,
  language,
}: OwnerViewProps) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  const totalPages = Math.ceil(filteredRecentEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentEntries = filteredRecentEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4 items-stretch">
        {/* Left: 7-day egg chart */}
        <Card className="lg:col-span-3 flex flex-col h-[340px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5 shrink-0">
            <CardTitle className="text-sm font-semibold">
              {t("7-day egg production", language)}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                {t("Today", language)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-muted inline-block" />
                {t("Previous days", language)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 flex-1 min-h-0">
            <EggProductionChart
              data={data?.last_7_days_eggs ?? []}
              language={language}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* Right: Quick Stats Strip + Recent Entries */}
        <Card className="lg:col-span-2 flex flex-col h-[340px] overflow-hidden">
          {/* Entries header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{t("Recent entries", language)}</p>
            <Link href="/daily-log" className="text-xs text-primary hover:underline font-medium">{t("View all", language)}</Link>
          </div>

          {/* Entries list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {recentEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group">
                <div className={cn(
                  "w-0.5 h-8 rounded-full shrink-0",
                  entry.type === 'sale'    && "bg-[hsl(var(--revenue))]",
                  entry.type === 'expense' && "bg-[hsl(var(--expense))]",
                  entry.type === 'log'     && "bg-primary/40",
                  entry.type === 'health'  && "bg-amber-400",
                )}/>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {formatEntryDescription(entry, language)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0", avatarColor(entry.recorded_by_name))}>
                      {entry.recorded_by_name?.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {entry.recorded_by_name} · {formatDate(entry.date, language)}
                    </span>
                  </div>
                </div>
                {entry.amount !== null && entry.amount !== undefined && Number(entry.amount) !== 0 ? (
                  <span className={cn(
                    "text-sm font-medium tabular-nums shrink-0",
                    entry.type === 'sale'
                      ? "text-[hsl(var(--revenue))]"
                      : "text-[hsl(var(--expense))]"
                  )}>
                    {entry.type === 'sale' ? '+' : '−'}ETB {Number(entry.amount).toLocaleString()}
                  </span>
                ) : entry.type === 'log' || entry.type === 'health' ? (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t(entry.type === 'log' ? 'Log' : 'Health', language)}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Farm Activity Feed (Full-Width, Owner Only) */}
      <Card className="rounded-xl border-border bg-card shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            {t("Farm activity", language)}
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
                {t(type === "log" ? "Logs" : type === "all" ? "All" : type, language)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Date", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider w-full">{t("Description", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Type", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Recorded By", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider text-right">{t("Amount", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider text-center">{t("Action", language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {currentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("No entries found matching this filter.", language)}
                    </td>
                  </tr>
                ) : (
                  currentEntries.map((entry) => (
                    <tr key={entry.id} className="text-sm hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(entry.date, language).slice(0, 6)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-1 h-5 rounded-full shrink-0",
                            entry.type === 'sale'    && "bg-[hsl(var(--revenue))]",
                            entry.type === 'expense' && "bg-[hsl(var(--expense))]",
                            entry.type === 'log'     && "bg-primary/40",
                            entry.type === 'health'  && "bg-amber-400",
                          )}/>
                          <span className="truncate max-w-[200px] sm:max-w-[300px]">{formatEntryDescription(entry, language)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium border-none shadow-none">
                          {t(entry.type === "log" ? "Log" : entry.type, language)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0", avatarColor(entry.recorded_by_name))}>
                            {entry.recorded_by_name?.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[120px]">{entry.recorded_by_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {entry.amount !== null && entry.amount !== undefined && Number(entry.amount) !== 0 ? (
                          <span className={cn(
                            "font-semibold tabular-nums",
                            entry.type === 'sale' ? "text-[hsl(var(--revenue))]" : "text-[hsl(var(--expense))]"
                          )}>
                            {entry.type === 'sale' ? '+' : '−'}ETB {Number(entry.amount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-medium"
                            >
                              {t("Options", language)} <ChevronDown className="ml-1.5 w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("Actions", language)}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewingEntry(entry)}>
                              <Eye className="mr-2 w-4 h-4" />
                              {t("View Details", language)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if (entry.type === 'log') router.push('/daily-log');
                              else if (entry.type === 'sale') router.push('/sales');
                              else if (entry.type === 'expense') router.push('/expenses');
                              else if (entry.type === 'health') router.push('/health');
                            }}>
                              <Edit2 className="mr-2 w-4 h-4" />
                              {t("Edit", language)}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteEntry(entry.id, entry.type)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 w-4 h-4" />
                              {t("Delete", language)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/5 rounded-b-xl shrink-0">
              <div className="text-[10px] text-muted-foreground font-medium">
                {t("Showing", language)} {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredRecentEntries.length)} {t("of", language)} {filteredRecentEntries.length}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-6 px-2 text-[10px]"
                >
                  {t("Previous", language)}
                </Button>
                <div className="text-[10px] font-medium px-1 text-muted-foreground">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-6 px-2 text-[10px]"
                >
                  {t("Next", language)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Row 4: Farm Accounts (Full-Width, Owner Only) */}
      <Card className="rounded-xl border-border bg-card shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            {t("Farm accounts", language)}
          </h4>
          <Link href="/users">
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold gap-1 rounded-lg border-border hover:bg-muted">
              <Plus className="w-3 h-3" />
              {t("Add user", language)}
            </Button>
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider w-full">{t("Name", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Role", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Email", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("Joined", language)}</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider text-right pr-4">{t("Actions", language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((u) => {
                  const initials = u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const joinedDate = (() => {
                    try {
                      return new Date(u.created_at).toLocaleDateString(language === "am" ? "am-ET" : "en-US", { calendar: language === "am" ? "ethiopic" : undefined, month: "short", year: "numeric" });
                    } catch (e) {
                      return "Jan 2026";
                    }
                  })();

                  return (
                    <tr key={u.id} className="text-sm hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 select-none",
                              u.role === "owner" ? "bg-emerald-600" : "bg-blue-600"
                            )}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-foreground truncate">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "owner" ? (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium border-none shadow-none bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                            {t("Owner", language)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium border-none shadow-none">
                            {t("Employee", language)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{joinedDate}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(u)}
                          className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1.5 rounded-md px-3"
                        >
                          <KeyRound className="w-3 h-3" />
                          {t("Reset password", language)}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              {t("7-day egg production", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EggProductionChart
              data={data?.last_7_days_eggs ?? []}
              language={language}
              className="h-[180px]"
            />
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
                  <p className="text-sm font-medium text-foreground truncate">{formatEntryDescription(entry, language)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.recorded_by_name} · {formatDate(entry.date, language)}</p>
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
