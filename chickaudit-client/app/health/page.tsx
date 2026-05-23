"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { HealthEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { FloatingInput } from "@/components/ui/floating-input";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "death", label: "Death" },
  { value: "vet_visit", label: "Vet visit" },
  { value: "vaccination", label: "Vaccination" },
  { value: "illness", label: "Illness observed" },
  { value: "recovery", label: "Recovery" },
];

const EVENT_BADGE: Record<
  string,
  "destructive" | "warning" | "success" | "secondary" | "outline"
> = {
  death: "destructive",
  illness: "warning",
  vet_visit: "secondary",
  vaccination: "success",
  recovery: "success",
};

export default function HealthPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Swipe-to-delete state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

  // Modals/Edit state
  const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<HealthEvent | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        searchTerm === "" ||
        (ev.details &&
          ev.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ev.recorded_by_name &&
          ev.recorded_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || ev.event_type === typeFilter;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && ev.event_date.split("T")[0] >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && ev.event_date.split("T")[0] <= endDate;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [events, searchTerm, typeFilter, startDate, endDate]);

  const [form, setForm] = useState({
    event_date: new Date().toISOString().split("T")[0],
    event_type: "death",
    details: "",
  });

  const [editForm, setEditForm] = useState({
    event_date: "",
    event_type: "death",
    details: "",
  });

  function fetchEvents() {
    api
      .get<HealthEvent[]>("/health")
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/health", form);
      toast({ title: t("Event logged", language) });
      setForm({
        event_date: new Date().toISOString().split("T")[0],
        event_type: "death",
        details: "",
      });
      fetchEvents();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Failed to save", language),
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setUpdating(true);
    try {
      await api.put(`/health/${editingEvent.id}`, editForm);
      toast({
        title: t("Event updated", language),
        description: t("Health event changes saved successfully.", language),
      });
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Failed to update", language),
        description: err.message,
      });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      await api.delete(`/health/${deletingEvent.id}`);
      toast({
        title: t("Event deleted", language),
        description: t("The health event record has been deleted.", language),
      });
      setDeletingEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Failed to delete", language),
        description: err.message,
      });
    } finally {
      setDeleting(false);
    }
  }

  const deathsMonth = events.filter(
    (ev) =>
      ev.event_type === "death" &&
      ev.event_date.startsWith(new Date().toISOString().slice(0, 7)),
  ).length;

  const [modalOpen, setModalOpen] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthEvents = filteredEvents.filter((ev) =>
    ev.event_date.startsWith(currentMonth),
  );
  const monthCount = currentMonthEvents.length;

  const eventBreakdown = useMemo(() => {
    return events.reduce<Record<string, number>>((acc, ev) => {
      acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
      return acc;
    }, {});
  }, [events]);

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

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t("Health", language)}
        subtitle={`${t("Deaths this month", language)}: ${deathsMonth}`}
      />

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("Health events", language)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {events.length} {t("records logged", language)}
            </p>
          </div>
          <Button className="h-11" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("New event", language)}
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5 mb-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("Search details or recorder", language)}
              </Label>
              <Input
                placeholder={t("Search details or recorder...", language)}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("Event type", language)}
              </Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All", language)}</SelectItem>
                  {EVENT_TYPES.map((t_opt) => (
                    <SelectItem key={t_opt.value} value={t_opt.value}>
                      {t(t_opt.label, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("From", language)}
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
                {t("To", language)}
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="flex items-end justify-end">
              {searchTerm || typeFilter !== "all" || startDate || endDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-9"
                >
                  {t("Clear", language)}
                </Button>
              ) : (
                <div className="h-9" />
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground px-6 py-2 border-b border-border/50">
            {t("This month", language)}: {monthCount} {t("events logged", language)}
          </div>

          {Object.keys(eventBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-border/50 text-xs text-muted-foreground">
              {Object.entries(eventBreakdown).map(([type, count]) => (
                <span
                  key={type}
                  className="bg-muted rounded-full px-3 py-1 capitalize"
                >
                  {t(type.replace("_", " "), language)} {count}
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="px-4 sm:px-0">
              {filteredEvents.length === 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <tbody>
                      <tr>
                        <td
                          colSpan={user?.role === "owner" ? 6 : 5}
                          className="p-8 text-center text-sm text-muted-foreground"
                        >
                          {searchTerm ||
                          typeFilter !== "all" ||
                          startDate ||
                          endDate
                            ? t("No events match your filters.", language)
                            : t(
                                "No events recorded yet. Add your first health event.",
                                language,
                              )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">{t("Date", language)}</th>
                        <th className="py-3 px-4">{t("Type", language)}</th>
                        <th className="py-3 px-4">{t("Details", language)}</th>
                        <th className="py-3 px-4">
                          {t("Recorded by", language)}
                        </th>
                        {user?.role === "owner" && (
                          <th className="py-3 px-4 text-center">
                            {t("Delete", language)}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((ev, index) => (
                        <tr
                          key={ev.id}
                          className={cn(
                            "group border-b border-border/50 hover:bg-muted/30 transition-colors",
                            index % 2 === 1 ? "bg-muted/10" : "",
                          )}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            {formatDate(ev.event_date, language)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              variant={
                                EVENT_BADGE[ev.event_type] ?? "secondary"
                              }
                              className="text-[11px] font-semibold capitalize px-2 py-1"
                            >
                              {t(ev.event_type.replace("_", " "), language)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 max-w-[250px] break-words">
                            {ev.details}
                          </td>
                          <td className="py-3 px-4 truncate max-w-[120px] text-muted-foreground">
                            {ev.recorded_by_name}
                          </td>
                          {user?.role === "owner" && (
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setDeletingEvent(ev)}
                                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="mx-auto w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t("Edit Health Event", language)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("Modify details for this health event.", language)}
              </p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_date">{t("Date", language)}</Label>
                <Input
                  id="edit_evt_date"
                  type="date"
                  value={editForm.event_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, event_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_type">{t("Event Type", language)}</Label>
                <Select
                  value={editForm.event_type}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, event_type: v })
                  }
                >
                  <SelectTrigger id="edit_evt_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t_opt) => (
                      <SelectItem key={t_opt.value} value={t_opt.value}>
                        {t(t_opt.label, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_details">{t("Details", language)}</Label>
                <Input
                  id="edit_evt_details"
                  value={editForm.details}
                  onChange={(e) =>
                    setEditForm({ ...editForm, details: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingEvent(null)}
                  disabled={updating}
                >
                  {t("Cancel", language)}
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {t("Save Changes", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> {t("Delete entry", language)}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("You are about to permanently delete", language)}?{" "}
                {t("This cannot be undone", language)}.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingEvent(null)}
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
