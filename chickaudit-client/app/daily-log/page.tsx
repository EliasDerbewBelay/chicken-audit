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
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        (log.notes &&
          log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.logged_by_name &&
          log.logged_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

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
    api
      .get<DailyLog[]>("/daily-logs")
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

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
      toast({
        title: "Log saved",
        description: `${form.eggs_collected} eggs recorded.`,
      });
      setModalOpen(false);
      setForm({
        log_date: new Date().toISOString().split("T")[0],
        eggs_collected: "",
        feed_given_kg: "",
        deaths: "0",
        notes: "",
      });
      fetchLogs();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: err.message,
      });
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
      toast({
        title: "Log updated",
        description: "Daily log changes saved successfully.",
      });
      setEditingLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: err.message,
      });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingLog) return;
    setDeleting(true);
    try {
      await api.delete(`/daily-logs/${deletingLog.id}`);
      toast({
        title: "Log deleted",
        description: "The daily log has been deleted.",
      });
      setDeletingLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: err.message,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Responsive Header */}
      <PageHeader
        title={t("Daily log", language)}
        subtitle={t("Record today's eggs feed and any deaths", language)}
      />

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("Recent logs", language)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {logs.length} entries recorded
            </p>
          </div>
          <Button className="h-11" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("New entry", language)}
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5 mb-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Search notes or logger...
              </Label>
              <Input
                placeholder="Search notes or logger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                From
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                To
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="flex items-end justify-end">
              {searchTerm || startDate || endDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-9"
                >
                  Clear
                </Button>
              ) : (
                <div className="h-9" />
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="px-4 sm:px-0">
              {filteredLogs.length === 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <tbody>
                      <tr>
                        <td
                          colSpan={user?.role === "owner" ? 7 : 6}
                          className="p-8 text-center text-sm text-muted-foreground"
                        >
                          {searchTerm || startDate || endDate
                            ? "No logs found. Try clearing the filters."
                            : "Add your first entry."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Eggs collected</th>
                        <th className="p-3">Feed given (kg)</th>
                        <th className="p-3">Deaths</th>
                        <th className="p-3">Recorded by</th>
                        <th className="p-3">Notes</th>
                        {user?.role === "owner" && (
                          <th className="p-3 text-center">Delete</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, index) => {
                        const initials = log.logged_by_name
                          ? log.logged_by_name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0].toUpperCase())
                              .join("")
                          : "--";

                        return (
                          <tr
                            key={log.id}
                            className={cn(
                              "group border-b border-border/50 hover:bg-muted/30",
                              index % 2 === 1 ? "bg-muted/10" : "",
                            )}
                          >
                            <td className="p-3 whitespace-nowrap">
                              {formatDate(log.log_date)}
                            </td>
                            <td className="p-3 font-medium whitespace-nowrap">
                              {log.eggs_collected} eggs
                            </td>
                            <td className="p-3 font-medium whitespace-nowrap">
                              {Number(log.feed_given_kg).toFixed(2)} kg
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={
                                  log.deaths > 0
                                    ? "text-destructive font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {log.deaths}
                              </span>
                            </td>
                            <td className="p-3 flex items-center gap-3 whitespace-nowrap">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
                                {initials}
                              </span>
                              <span className="truncate max-w-[110px] text-sm text-foreground">
                                {log.logged_by_name}
                              </span>
                            </td>
                            <td className="p-3 max-w-[200px] truncate text-sm text-foreground">
                              {log.notes || "—"}
                            </td>
                            {user?.role === "owner" && (
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setDeletingLog(log)}
                                  className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="mx-auto w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={() => setModalOpen(false)}
        >
          <div
            className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t("New entry", language)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Record a new daily log entry.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) =>
                  setForm({ ...form, eggs_collected: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, feed_given_kg: e.target.value })
                }
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
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Save log", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Edit Daily Log
              </h3>
              <p className="text-sm text-muted-foreground">
                Modify recorded data for this day.
              </p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_log_date">Date</Label>
                <Input
                  id="edit_log_date"
                  type="date"
                  value={editForm.log_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, log_date: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, eggs_collected: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, feed_given_kg: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, deaths: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_notes">Notes</Label>
                <Input
                  id="edit_notes"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
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
                  {updating && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
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
                {t("You are about to permanently delete", language)}{" "}
                <span className="font-semibold">
                  {formatDate(deletingLog.log_date)}
                </span>
                ? {t("This cannot be undone", language)}.
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
