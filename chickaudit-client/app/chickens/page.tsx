"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { ChickenAdjustment } from "@/types";
import { formatDate, cn } from "@/lib/utils";
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
import { useToast } from "@/components/ui/toaster";
import { Loader2, Plus, Bird } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { FloatingInput } from "@/components/ui/floating-input";

export default function ChickensPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [adjustments, setAdjustments] = useState<ChickenAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredAdjustments = useMemo(() => {
    if (typeFilter === "all") return adjustments;
    return adjustments.filter((a) => a.type === typeFilter);
  }, [adjustments, typeFilter]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "addition",
    quantity: "",
    reason: "",
  });

  function fetchAdjustments() {
    api
      .get<ChickenAdjustment[]>("/chickens")
      .then(setAdjustments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAdjustments();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/chickens", {
        date: form.date,
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason || null,
      });
      toast({
        title: t("Success", language),
        description: t("Chicken record saved.", language),
      });
      setModalOpen(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        type: "addition",
        quantity: "",
        reason: "",
      });
      fetchAdjustments();
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

  useEffect(() => {
    if (!modalOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  return (
    <div className="space-y-4 md:space-y-6 pt-2 md:pt-4">
      <PageHeader
        title={t("Chickens", language)}
        subtitle={t("Manage your flock sizes and adjustments", language)}
      />

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("Flock Ledger", language)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {adjustments.length} {t("records found", language)}
            </p>
          </div>
          <Button className="h-11" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("Add Record", language)}
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1 md:col-span-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Filter by Type
              </Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="addition">Addition (e.g. bought)</SelectItem>
                  <SelectItem value="reduction">Reduction (e.g. sold/removed)</SelectItem>
                  <SelectItem value="audit">Audit (recount baseline)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="px-4 sm:px-0">
              {filteredAdjustments.length === 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-8 text-center text-sm text-muted-foreground">
                          {typeFilter !== "all"
                            ? "No records match your filter."
                            : "No flock records yet. Add your first adjustment."}
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
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Quantity</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Recorded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdjustments.map((adj, index) => {
                        const initials = adj.recorded_by_name
                          ? adj.recorded_by_name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0].toUpperCase())
                              .join("")
                          : "--";

                        let typeColor = "";
                        let prefix = "";
                        if (adj.type === "addition") {
                          typeColor = "bg-[hsl(var(--revenue))]/15 text-[hsl(var(--revenue))]";
                          prefix = "+";
                        } else if (adj.type === "reduction") {
                          typeColor = "bg-[hsl(var(--expense))]/15 text-[hsl(var(--expense))]";
                          prefix = "-";
                        } else {
                          typeColor = "bg-primary/15 text-primary";
                          prefix = "";
                        }

                        return (
                          <tr
                            key={adj.id}
                            className={cn(
                              "group border-b border-border/50 hover:bg-muted/30 transition-colors",
                              index % 2 === 1 ? "bg-muted/10" : ""
                            )}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              {formatDate(adj.date)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
                                  typeColor
                                )}
                              >
                                {adj.type}
                              </span>
                            </td>
                            <td className={cn(
                              "py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap",
                              adj.type === "addition" ? "text-[hsl(var(--revenue))]" : 
                              adj.type === "reduction" ? "text-[hsl(var(--expense))]" : "text-foreground"
                            )}>
                              {prefix}{adj.quantity}
                            </td>
                            <td className="py-3 px-4 truncate max-w-[200px]">
                              {adj.reason || "—"}
                            </td>
                            <td className="py-3 px-4 flex items-center gap-3 whitespace-nowrap">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <span className="text-sm text-foreground truncate max-w-[110px]">
                                {adj.recorded_by_name || "System"}
                              </span>
                            </td>
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
                {t("New Chicken Record", language)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Log a change to the active flock count.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FloatingInput
                type="date"
                label={t("Date", language)}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("Type", language)}
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition (e.g. bought new chicks)</SelectItem>
                    <SelectItem value="reduction">Reduction (e.g. sold/removed)</SelectItem>
                    <SelectItem value="audit">Audit (physical recount/set exact total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FloatingInput
                type="number"
                min="0"
                placeholder="..."
                label={t("Quantity", language)}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
              <FloatingInput
                placeholder="..."
                label={`${t("Reason", language)} (${t("optional", language)})`}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
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
                  {t("Save Record", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
