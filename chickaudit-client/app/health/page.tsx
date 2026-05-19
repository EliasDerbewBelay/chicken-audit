"use client";

import { useEffect, useState, useMemo } from "react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground">{t("Health", language)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("Deaths this month", language)}: <span className={deathsMonth > 0 ? "text-[hsl(var(--expense))] font-medium" : "text-muted-foreground"}>{deathsMonth}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" />{t("Log health event", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("Date", language)}</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Event type", language)}</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t_opt) => <SelectItem key={t_opt.value} value={t_opt.value}>{t(t_opt.label, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Details", language)}</Label>
                <Input placeholder="..." value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Log event", language)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">{t("Health history", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 bg-muted/20 p-2.5 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Details / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Event Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
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
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">To Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div>
                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">{t("No entries yet", language)}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
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
                      <tbody className="divide-y divide-border">
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
                              <div className="flex items-center justify-center gap-0.5">
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
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
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
                    {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
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
