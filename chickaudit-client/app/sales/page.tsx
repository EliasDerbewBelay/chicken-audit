"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { Sale } from "@/types";
import { formatETB, formatDate } from "@/lib/utils";
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

export default function SalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Swipe-to-delete state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

  // Modals/Edit state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        searchTerm === "" ||
        (sale.buyer &&
          sale.buyer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sale.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || sale.type === typeFilter;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && sale.sale_date.split("T")[0] >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && sale.sale_date.split("T")[0] <= endDate;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [sales, searchTerm, typeFilter, startDate, endDate]);

  const [form, setForm] = useState({
    sale_date: new Date().toISOString().split("T")[0],
    type: "eggs",
    quantity: "",
    amount_etb: "",
    buyer: "",
  });

  const [editForm, setEditForm] = useState({
    sale_date: "",
    type: "eggs",
    quantity: "",
    amount_etb: "",
    buyer: "",
  });

  function fetchSales() {
    api
      .get<Sale[]>("/sales")
      .then(setSales)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSales();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/sales", {
        sale_date: form.sale_date,
        type: form.type,
        quantity: Number(form.quantity),
        amount_etb: Number(form.amount_etb),
        buyer: form.buyer || null,
      });
      toast({
        title: "Sale recorded",
        description: `${formatETB(Number(form.amount_etb))} sale saved.`,
      });
      setModalOpen(false);
      setForm({
        sale_date: new Date().toISOString().split("T")[0],
        type: "eggs",
        quantity: "",
        amount_etb: "",
        buyer: "",
      });
      fetchSales();
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
    if (!editingSale) return;
    setUpdating(true);
    try {
      await api.put(`/sales/${editingSale.id}`, {
        sale_date: editForm.sale_date,
        type: editForm.type,
        quantity: Number(editForm.quantity),
        amount_etb: Number(editForm.amount_etb),
        buyer: editForm.buyer || null,
      });
      toast({
        title: "Sale updated",
        description: "Sale changes saved successfully.",
      });
      setEditingSale(null);
      fetchSales();
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
    if (!deletingSale) return;
    setDeleting(true);
    try {
      await api.delete(`/sales/${deletingSale.id}`);
      toast({
        title: "Sale deleted",
        description: "The sale record has been deleted.",
      });
      setDeletingSale(null);
      fetchSales();
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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSales = filteredSales.filter((sale) =>
    sale.sale_date.startsWith(currentMonth),
  );
  const totalMonth = currentMonthSales.reduce(
    (sum, sale) => sum + Number(sale.amount_etb),
    0,
  );
  const monthCount = currentMonthSales.length;

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
      {/* Responsive Header */}
      <PageHeader
        title={t("Sales", language)}
        subtitle={`${t("This month", language)}: ${formatETB(totalMonth)}`}
      />

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("Sales", language)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {sales.length} sales recorded
            </p>
          </div>
          <Button className="h-11" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("New sale", language)}
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5 mb-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Search buyer or type...
              </Label>
              <Input
                placeholder="Search buyer or type..."
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

          <div className="text-sm text-muted-foreground px-6 py-2 border-b border-border/50">
            This month: ETB {formatETB(totalMonth)} total across {monthCount}{" "}
            sales
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="px-4 sm:px-0">
              {filteredSales.length === 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <tbody>
                      <tr>
                        <td
                          colSpan={user?.role === "owner" ? 7 : 6}
                          className="p-8 text-center text-sm text-muted-foreground"
                        >
                          {searchTerm || startDate || endDate
                            ? "No sales match your filters. Try clearing them."
                            : "No sales recorded yet. Add your first sale."}
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
                        <th className="py-3 px-4 text-right">Amount (ETB)</th>
                        <th className="py-3 px-4">Buyer</th>
                        <th className="py-3 px-4">Recorded by</th>
                        {user?.role === "owner" && (
                          <th className="py-3 px-4 text-center">Delete</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale, index) => {
                        const initials = sale.recorded_by_name
                          ? sale.recorded_by_name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0].toUpperCase())
                              .join("")
                          : "--";

                        return (
                          <tr
                            key={sale.id}
                            className={cn(
                              "group border-b border-border/50 hover:bg-muted/30 transition-colors",
                              index % 2 === 1 ? "bg-muted/10" : "",
                            )}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              {formatDate(sale.sale_date)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
                                  sale.type === "eggs"
                                    ? "bg-primary/15 text-primary"
                                    : "bg-amber-accent/15 text-amber-accent",
                                )}
                              >
                                {sale.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium tabular-nums whitespace-nowrap">
                              {sale.quantity}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-[hsl(var(--revenue))] tabular-nums whitespace-nowrap">
                              +ETB {formatETB(Number(sale.amount_etb))}
                            </td>
                            <td className="py-3 px-4 truncate max-w-[200px]">
                              {sale.buyer || "—"}
                            </td>
                            <td className="py-3 px-4 flex items-center gap-3 whitespace-nowrap">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <span className="text-sm text-foreground truncate max-w-[110px]">
                                {sale.recorded_by_name}
                              </span>
                            </td>
                            {user?.role === "owner" && (
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setDeletingSale(sale)}
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
                {t("New sale", language)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Record a new sale entry.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FloatingInput
                type="date"
                label={t("Date", language)}
                value={form.sale_date}
                onChange={(e) =>
                  setForm({ ...form, sale_date: e.target.value })
                }
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
                    <SelectItem value="eggs">{t("Eggs", language)}</SelectItem>
                    <SelectItem value="broiler">
                      {t("Broiler chickens", language)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <FloatingInput
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="..."
                  label={t("Quantity", language)}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  required
                />
                <FloatingInput
                  type="number"
                  min="0"
                  placeholder="..."
                  label={t("Amount (ETB)", language)}
                  value={form.amount_etb}
                  onChange={(e) =>
                    setForm({ ...form, amount_etb: e.target.value })
                  }
                  required
                />
              </div>
              <FloatingInput
                placeholder="..."
                label={`${t("Buyer", language)} (${t("optional", language)})`}
                value={form.buyer}
                onChange={(e) => setForm({ ...form, buyer: e.target.value })}
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
                  {t("Save sale", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Edit Sale</h3>
              <p className="text-sm text-muted-foreground">
                Modify recorded data for this sale.
              </p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_sale_date">Date</Label>
                <Input
                  id="edit_sale_date"
                  type="date"
                  value={editForm.sale_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sale_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_type">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                >
                  <SelectTrigger id="edit_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eggs">Eggs</SelectItem>
                    <SelectItem value="broiler">Broiler chickens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_qty">Quantity</Label>
                  <Input
                    id="edit_qty"
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quantity: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_amt">Amount (ETB)</Label>
                  <Input
                    id="edit_amt"
                    type="number"
                    min="0"
                    value={editForm.amount_etb}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount_etb: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_buyer">Buyer</Label>
                <Input
                  id="edit_buyer"
                  value={editForm.buyer}
                  onChange={(e) =>
                    setEditForm({ ...editForm, buyer: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingSale(null)}
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
      {deletingSale && (
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
                onClick={() => setDeletingSale(null)}
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
