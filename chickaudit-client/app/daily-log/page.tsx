"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { DailyLog } from "@/types";
import { formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { FloatingInput } from "@/components/ui/floating-input";

export default function DailyLogPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Swipe-to-delete state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

  // Modals/Edit state
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<DailyLog | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.logged_by_name && log.logged_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && log.log_date.split("T")[0] >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && log.log_date.split("T")[0] <= endDate;
      }

      return matchesSearch && matchesDate;
    });
  }, [logs, searchTerm, startDate, endDate]);

  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    eggs_collected: "",
    feed_given_kg: "",
    deaths: "0",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    log_date: "",
    eggs_collected: "",
    feed_given_kg: "",
    deaths: "0",
    notes: "",
  });

  function fetchLogs() {
    api.get<DailyLog[]>("/daily-logs").then(setLogs).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchLogs(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/daily-logs", {
        log_date: form.log_date,
        eggs_collected: Number(form.eggs_collected),
        feed_given_kg: Number(form.feed_given_kg),
        deaths: Number(form.deaths),
        notes: form.notes || null,
      });
      toast({ title: "Log saved", description: `${form.eggs_collected} eggs recorded.` });
      setForm({ log_date: new Date().toISOString().split("T")[0], eggs_collected: "", feed_given_kg: "", deaths: "0", notes: "" });
      fetchLogs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLog) return;
    setUpdating(true);
    try {
      await api.put(`/daily-logs/${editingLog.id}`, {
        log_date: editForm.log_date,
        eggs_collected: Number(editForm.eggs_collected),
        feed_given_kg: Number(editForm.feed_given_kg),
        deaths: Number(editForm.deaths),
        notes: editForm.notes || null,
      });
      toast({ title: "Log updated", description: "Daily log changes saved successfully." });
      setEditingLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update", description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingLog) return;
    setDeleting(true);
    try {
      await api.delete(`/daily-logs/${deletingLog.id}`);
      toast({ title: "Log deleted", description: "The daily log has been deleted." });
      setDeletingLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Responsive Header */}
      <PageHeader title={t("Daily log", language)} subtitle={t("Record today's eggs feed and any deaths", language)} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Plus className="w-4 h-4 text-primary" />
              {t("New entry", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                id="log_date"
                type="date"
                label={t("Date", language)}
                value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                required
              />
              <FloatingInput
                id="eggs"
                type="number"
                min="0"
                placeholder="e.g. 162"
                label={t("Eggs collected", language)}
                value={form.eggs_collected}
                onChange={(e) => setForm({ ...form, eggs_collected: e.target.value })}
                required
              />
              <FloatingInput
                id="feed"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 22"
                label={t("Feed given (kg)", language)}
                value={form.feed_given_kg}
                onChange={(e) => setForm({ ...form, feed_given_kg: e.target.value })}
                required
              />
              <FloatingInput
                id="deaths"
                type="number"
                min="0"
                label={t("Deaths", language)}
                value={form.deaths}
                onChange={(e) => setForm({ ...form, deaths: e.target.value })}
              />
              <FloatingInput
                id="notes"
                placeholder="..."
                label={`${t("Notes", language)} (${t("optional", language)})`}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="md:static sticky-save mt-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Save log", language)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">{t("Recent logs", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 bg-muted/40 p-3 rounded-xl border border-border mx-4 sm:mx-0">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Notes / logger..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">From Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">To Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="px-4 sm:px-0">
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">{t("No logs yet", language)}</p>
                ) : (
                  <>
                    {/* Desktop table view */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                          <tr>
                            <th className="p-3">{t("Date", language)}</th>
                            <th className="p-3">{t("Eggs collected", language)}</th>
                            <th className="p-3">{t("Feed given (kg)", language)}</th>
                            <th className="p-3">{t("Deaths", language)}</th>
                            <th className="p-3">{t("Recorded by", language)}</th>
                            <th className="p-3">{t("Notes", language)}</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 whitespace-nowrap">{formatDate(log.log_date)}</td>
                              <td className="p-3 font-medium whitespace-nowrap">{log.eggs_collected} eggs</td>
                              <td className="p-3 font-medium whitespace-nowrap">{log.feed_given_kg} kg</td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={log.deaths > 0 ? "text-[hsl(var(--expense))] font-semibold" : "text-muted-foreground"}>
                                  {log.deaths}
                                </span>
                              </td>
                              <td className="p-3 truncate max-w-[120px] text-muted-foreground">{log.logged_by_name}</td>
                              <td className="p-3 italic break-words max-w-[150px]">{log.notes || "—"}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {(user?.role === "owner" || log.logged_by === user?.id) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingLog(log);
                                        setEditForm({
                                          log_date: log.log_date.split("T")[0],
                                          eggs_collected: String(log.eggs_collected),
                                          feed_given_kg: String(log.feed_given_kg),
                                          deaths: String(log.deaths),
                                          notes: log.notes || "",
                                        });
                                      }}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {user?.role === "owner" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => setDeletingLog(log)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card list view */}
                    <div className="md:hidden space-y-2">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="relative overflow-hidden bg-card rounded-xl border border-border shadow-sm group"
                          onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                          }}
                          onTouchMove={(e) => {
                            const diff = touchStart.current - e.touches[0].clientX;
                            if (diff > 50) setSwipedId(log.id);
                            if (diff < -50) setSwipedId(null);
                          }}
                        >
                          {/* Main card content */}
                          <div
                            className={cn(
                              "p-4 flex items-center justify-between transition-transform duration-200 bg-card z-10 relative",
                              swipedId === log.id && "-translate-x-[110px]"
                            )}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {formatDate(log.log_date)}
                                </span>
                                {log.notes && (
                                  <span className="text-[10px] text-muted-foreground truncate italic">
                                    &ldquo;{log.notes}&rdquo;
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {log.eggs_collected} eggs · {log.feed_given_kg} kg feed · {log.logged_by_name}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              {log.deaths > 0 ? (
                                <span className="text-xs font-bold text-[hsl(var(--expense))] bg-[hsl(var(--expense))]/10 px-2 py-0.5 rounded-full">
                                  {log.deaths} deaths
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                  0 deaths
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions drawer (slides out) */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center z-0 bg-muted">
                            {(user?.role === "owner" || log.logged_by === user?.id) && (
                              <button
                                onClick={() => {
                                  setSwipedId(null);
                                  setEditingLog(log);
                                  setEditForm({
                                    log_date: log.log_date.split("T")[0],
                                    eggs_collected: String(log.eggs_collected),
                                    feed_given_kg: String(log.feed_given_kg),
                                    deaths: String(log.deaths),
                                    notes: log.notes || "",
                                  });
                                }}
                                className="w-[55px] h-full bg-primary/10 text-primary flex items-center justify-center transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {user?.role === "owner" && (
                              <button
                                onClick={() => {
                                  setSwipedId(null);
                                  setDeletingLog(log);
                                }}
                                className="w-[55px] h-full bg-[hsl(var(--expense))]/10 text-[hsl(var(--expense))] flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Edit Daily Log</h3>
              <p className="text-sm text-muted-foreground">Modify recorded data for this day.</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_log_date">Date</Label>
                <Input
                  id="edit_log_date"
                  type="date"
                  value={editForm.log_date}
                  onChange={(e) => setEditForm({ ...editForm, log_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_eggs">Eggs collected</Label>
                <Input
                  id="edit_eggs"
                  type="number"
                  min="0"
                  value={editForm.eggs_collected}
                  onChange={(e) => setEditForm({ ...editForm, eggs_collected: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_feed">Feed given (kg)</Label>
                <Input
                  id="edit_feed"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editForm.feed_given_kg}
                  onChange={(e) => setEditForm({ ...editForm, feed_given_kg: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_deaths">Deaths</Label>
                <Input
                  id="edit_deaths"
                  type="number"
                  min="0"
                  value={editForm.deaths}
                  onChange={(e) => setEditForm({ ...editForm, deaths: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_notes">Notes</Label>
                <Input
                  id="edit_notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingLog(null)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> {t("Delete entry", language)}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("You are about to permanently delete", language)} <span className="font-semibold">{formatDate(deletingLog.log_date)}</span>? {t("This cannot be undone", language)}.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingLog(null)}
                disabled={deleting}
              >
                {t("Cancel", language)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Delete", language)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
