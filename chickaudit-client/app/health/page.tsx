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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const EVENT_BADGE: Record<string, "destructive" | "warning" | "success" | "secondary" | "outline"> = {
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
        (ev.details && ev.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ev.recorded_by_name && ev.recorded_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

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
    api.get<HealthEvent[]>("/health").then(setEvents).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchEvents(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/health", form);
      toast({ title: "Event logged" });
      setForm({ event_date: new Date().toISOString().split("T")[0], event_type: "death", details: "" });
      fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
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
      toast({ title: "Event updated", description: "Health event changes saved successfully." });
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update", description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingEvent) return;
    setDeleting(true);
    try {
      await api.delete(`/health/${deletingEvent.id}`);
      toast({ title: "Event deleted", description: "The health event record has been deleted." });
      setDeletingEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const deathsMonth = events
    .filter((ev) => ev.event_type === "death" && ev.event_date.startsWith(new Date().toISOString().slice(0, 7)))
    .length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("Health", language)}
        subtitle={`${t("Deaths this month", language)}: ${deathsMonth}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Plus className="w-4 h-4 text-primary" />
              {t("Log health event", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                type="date"
                label={t("Date", language)}
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Event type", language)}</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t_opt) => <SelectItem key={t_opt.value} value={t_opt.value}>{t(t_opt.label, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FloatingInput
                placeholder="..."
                label={t("Details", language)}
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                required
              />
              <div className="md:static sticky-save mt-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Log event", language)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">{t("Health history", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4 bg-muted/40 p-3 rounded-xl border border-border mx-4 sm:mx-0">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Details / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Event Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">{t("No entries yet", language)}</p>
                ) : (
                  <>
                    {/* Desktop table view */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                          <tr>
                            <th className="p-3">{t("Date", language)}</th>
                            <th className="p-3">{t("Event type", language)}</th>
                            <th className="p-3">{t("Details", language)}</th>
                            <th className="p-3">{t("Recorded by", language)}</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {filteredEvents.map((ev) => (
                            <tr key={ev.id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 whitespace-nowrap">{formatDate(ev.event_date)}</td>
                              <td className="p-3 whitespace-nowrap">
                                <Badge variant={EVENT_BADGE[ev.event_type] ?? "secondary"} className="text-[10px] py-0.5 px-1.5 font-normal capitalize">
                                  {ev.event_type.replace("_", " ")}
                                </Badge>
                              </td>
                              <td className="p-3 text-foreground break-words max-w-[200px]">{ev.details}</td>
                              <td className="p-3 truncate max-w-[120px] text-muted-foreground">{ev.recorded_by_name}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {(user?.role === "owner" || ev.recorded_by === user?.id) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingEvent(ev);
                                        setEditForm({
                                          event_date: ev.event_date.split("T")[0],
                                          event_type: ev.event_type,
                                          details: ev.details,
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
                                      onClick={() => setDeletingEvent(ev)}
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
                      {filteredEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="relative overflow-hidden bg-card rounded-xl border border-border shadow-sm group"
                          onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                          }}
                          onTouchMove={(e) => {
                            const diff = touchStart.current - e.touches[0].clientX;
                            if (diff > 50) setSwipedId(ev.id);
                            if (diff < -50) setSwipedId(null);
                          }}
                        >
                          <div
                            className={cn(
                              "p-4 flex items-center justify-between transition-transform duration-200 bg-card z-10 relative",
                              swipedId === ev.id && "-translate-x-[110px]"
                            )}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {formatDate(ev.event_date)}
                                </span>
                                <Badge variant={EVENT_BADGE[ev.event_type] ?? "secondary"} className="text-[9px] font-normal leading-none py-0.5 px-1 capitalize">
                                  {ev.event_type.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {ev.details}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Recorded by {ev.recorded_by_name}
                              </p>
                            </div>
                          </div>

                          {/* Actions drawer (slides out) */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center z-0 bg-muted">
                            {(user?.role === "owner" || ev.recorded_by === user?.id) && (
                              <button
                                onClick={() => {
                                  setSwipedId(null);
                                  setEditingEvent(ev);
                                  setEditForm({
                                    event_date: ev.event_date.split("T")[0],
                                    event_type: ev.event_type,
                                    details: ev.details,
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
                                  setDeletingEvent(ev);
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
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Edit Health Event</h3>
              <p className="text-sm text-muted-foreground">Modify details for this health event.</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_date">Date</Label>
                <Input
                  id="edit_evt_date"
                  type="date"
                  value={editForm.event_date}
                  onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_type">Event Type</Label>
                <Select value={editForm.event_type} onValueChange={(v) => setEditForm({ ...editForm, event_type: v })}>
                  <SelectTrigger id="edit_evt_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t_opt) => <SelectItem key={t_opt.value} value={t_opt.value}>{t(t_opt.label, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_evt_details">Details</Label>
                <Input
                  id="edit_evt_details"
                  value={editForm.details}
                  onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
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
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> {t("Delete entry", language)}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("You are about to permanently delete", language)}? {t("This cannot be undone", language)}.
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
