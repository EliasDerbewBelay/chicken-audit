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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        searchTerm === "" ||
        (sale.buyer && sale.buyer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.recorded_by_name && sale.recorded_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

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
    api.get<Sale[]>("/sales").then(setSales).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchSales(); }, []);

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
      toast({ title: "Sale recorded", description: `${formatETB(Number(form.amount_etb))} sale saved.` });
      setForm({ sale_date: new Date().toISOString().split("T")[0], type: "eggs", quantity: "", amount_etb: "", buyer: "" });
      fetchSales();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
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
      toast({ title: "Sale updated", description: "Sale changes saved successfully." });
      setEditingSale(null);
      fetchSales();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update", description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingSale) return;
    setDeleting(true);
    try {
      await api.delete(`/sales/${deletingSale.id}`);
      toast({ title: "Sale deleted", description: "The sale record has been deleted." });
      setDeletingSale(null);
      fetchSales();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const totalMonth = sales
    .filter((s) => s.sale_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, s) => sum + Number(s.amount_etb), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Responsive Header */}
      <PageHeader
        title={t("Sales", language)}
        subtitle={`${t("This month", language)}: ${formatETB(totalMonth)}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Plus className="w-4 h-4 text-primary" />
              {t("Record sale", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                type="date"
                label={t("Date", language)}
                value={form.sale_date}
                onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Type", language)}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eggs">{t("Eggs", language)}</SelectItem>
                    <SelectItem value="broiler">{t("Broiler chickens", language)}</SelectItem>
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
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
                <FloatingInput
                  type="number"
                  min="0"
                  placeholder="..."
                  label={t("Amount (ETB)", language)}
                  value={form.amount_etb}
                  onChange={(e) => setForm({ ...form, amount_etb: e.target.value })}
                  required
                />
              </div>
              <FloatingInput
                placeholder="..."
                label={`${t("Buyer", language)} (${t("optional", language)})`}
                value={form.buyer}
                onChange={(e) => setForm({ ...form, buyer: e.target.value })}
              />
              <div className="md:static sticky-save mt-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Save sale", language)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">{t("Recent sales", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4 bg-muted/40 p-3 rounded-xl border border-border mx-4 sm:mx-0">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Buyer / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="eggs">Eggs</SelectItem>
                    <SelectItem value="broiler">Broiler</SelectItem>
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
                {filteredSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">{t("No entries yet", language)}</p>
                ) : (
                  <>
                    {/* Desktop table view */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                          <tr>
                            <th className="p-3">{t("Date", language)}</th>
                            <th className="p-3">{t("Type", language)}</th>
                            <th className="p-3">{t("Quantity", language)}</th>
                            <th className="p-3">{t("Buyer", language)}</th>
                            <th className="p-3">{t("Recorded by", language)}</th>
                            <th className="p-3 text-right">{t("Amount", language)}</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {filteredSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                              <td className="p-3 whitespace-nowrap">
                                <Badge variant={sale.type === "eggs" ? "secondary" : "outline"} className="text-[10px] py-0.5 px-1.5 font-normal capitalize">
                                  {sale.type}
                                </Badge>
                              </td>
                              <td className="p-3 font-medium whitespace-nowrap">
                                {sale.quantity} {sale.type === "eggs" ? "trays" : "birds"}
                              </td>
                              <td className="p-3 truncate max-w-[120px]">{sale.buyer || "—"}</td>
                              <td className="p-3 truncate max-w-[120px] text-muted-foreground">{sale.recorded_by_name}</td>
                              <td className="p-3 text-right font-semibold text-[hsl(var(--revenue))] whitespace-nowrap">
                                +{formatETB(Number(sale.amount_etb))}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {(user?.role === "owner" || sale.recorded_by === user?.id) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingSale(sale);
                                        setEditForm({
                                          sale_date: sale.sale_date.split("T")[0],
                                          type: sale.type,
                                          quantity: String(sale.quantity),
                                          amount_etb: String(sale.amount_etb),
                                          buyer: sale.buyer || "",
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
                                      onClick={() => setDeletingSale(sale)}
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
                      {filteredSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="relative overflow-hidden bg-card rounded-xl border border-border shadow-sm group"
                          onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                          }}
                          onTouchMove={(e) => {
                            const diff = touchStart.current - e.touches[0].clientX;
                            if (diff > 50) setSwipedId(sale.id);
                            if (diff < -50) setSwipedId(null);
                          }}
                        >
                          <div
                            className={cn(
                              "p-4 flex items-center justify-between transition-transform duration-200 bg-card z-10 relative",
                              swipedId === sale.id && "-translate-x-[110px]"
                            )}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {formatDate(sale.sale_date)}
                                </span>
                                <Badge variant={sale.type === "eggs" ? "secondary" : "outline"} className="text-[9px] font-normal leading-none py-0.5 px-1 bg-muted border-none text-muted-foreground">
                                  {sale.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {sale.quantity} {sale.type === "eggs" ? "trays" : "birds"} · {sale.buyer ? `to ${sale.buyer}` : "Cash sale"}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <span className="text-xs font-bold text-[hsl(var(--revenue))]">
                                +{formatETB(Number(sale.amount_etb))}
                              </span>
                            </div>
                          </div>

                          {/* Actions drawer (slides out) */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center z-0 bg-muted">
                            {(user?.role === "owner" || sale.recorded_by === user?.id) && (
                              <button
                                onClick={() => {
                                  setSwipedId(null);
                                  setEditingSale(sale);
                                  setEditForm({
                                    sale_date: sale.sale_date.split("T")[0],
                                    type: sale.type,
                                    quantity: String(sale.quantity),
                                    amount_etb: String(sale.amount_etb),
                                    buyer: sale.buyer || "",
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
                                  setDeletingSale(sale);
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
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Edit Sale</h3>
              <p className="text-sm text-muted-foreground">Modify recorded data for this sale.</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_sale_date">Date</Label>
                <Input
                  id="edit_sale_date"
                  type="date"
                  value={editForm.sale_date}
                  onChange={(e) => setEditForm({ ...editForm, sale_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_type">Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger id="edit_type"><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, amount_etb: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_buyer">Buyer</Label>
                <Input
                  id="edit_buyer"
                  value={editForm.buyer}
                  onChange={(e) => setEditForm({ ...editForm, buyer: e.target.value })}
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
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                {t("You are about to permanently delete", language)}? {t("This cannot be undone", language)}.
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
