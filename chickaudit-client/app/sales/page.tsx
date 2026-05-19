"use client";

import { useEffect, useState, useMemo } from "react";
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

export default function SalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground">{t("Sales", language)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("This month", language)}: <span className="text-[hsl(var(--revenue))] font-medium">{formatETB(totalMonth)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" />{t("Record sale", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("Date", language)}</Label>
                <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Type", language)}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eggs">{t("Eggs", language)}</SelectItem>
                    <SelectItem value="broiler">{t("Broiler chickens", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Quantity", language)}</Label>
                  <Input type="number" min="0" step="0.5" placeholder="..." value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Amount (ETB)", language)}</Label>
                  <Input type="number" min="0" placeholder="..." value={form.amount_etb} onChange={(e) => setForm({ ...form, amount_etb: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Buyer", language)} <span className="text-muted-foreground font-normal">({t("optional", language)})</span></Label>
                <Input placeholder="..." value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Save sale", language)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">{t("Recent sales", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 bg-muted/20 p-2.5 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Buyer / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
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
                {filteredSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">{t("No entries yet", language)}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
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
                      <tbody className="divide-y divide-border">
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
                              <div className="flex items-center justify-center gap-0.5">
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
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
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
