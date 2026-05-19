"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Expense } from "@/types";
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

const CATEGORIES = [
  { value: "feed", label: "Feed" },
  { value: "medicine", label: "Medicine" },
  { value: "vaccine", label: "Vaccine" },
  { value: "wage", label: "Employee wage" },
  { value: "utilities", label: "Utilities" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modals/Edit state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      const matchesSearch =
        searchTerm === "" ||
        (ex.supplier && ex.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.category && ex.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.recorded_by_name && ex.recorded_by_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && ex.expense_date.split("T")[0] >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && ex.expense_date.split("T")[0] <= endDate;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [expenses, searchTerm, categoryFilter, startDate, endDate]);

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    category: "feed",
    amount_etb: "",
    supplier: "",
  });

  const [editForm, setEditForm] = useState({
    expense_date: "",
    category: "feed",
    amount_etb: "",
    supplier: "",
  });

  function fetchExpenses() {
    api.get<Expense[]>("/expenses").then(setExpenses).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchExpenses(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/expenses", {
        expense_date: form.expense_date,
        category: form.category,
        amount_etb: Number(form.amount_etb),
        supplier: form.supplier || null,
      });
      toast({ title: "Expense recorded", description: `${formatETB(Number(form.amount_etb))} expense saved.` });
      setForm({ expense_date: new Date().toISOString().split("T")[0], category: "feed", amount_etb: "", supplier: "" });
      fetchExpenses();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    setUpdating(true);
    try {
      await api.put(`/expenses/${editingExpense.id}`, {
        expense_date: editForm.expense_date,
        category: editForm.category,
        amount_etb: Number(editForm.amount_etb),
        supplier: editForm.supplier || null,
      });
      toast({ title: "Expense updated", description: "Expense changes saved successfully." });
      setEditingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update", description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingExpense) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deletingExpense.id}`);
      toast({ title: "Expense deleted", description: "The expense record has been deleted." });
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const totalMonth = expenses
    .filter((ex) => ex.expense_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, ex) => sum + Number(ex.amount_etb), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground">{t("Expenses", language)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("This month", language)}: <span className="text-[hsl(var(--expense))] font-medium">{formatETB(totalMonth)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" />{t("Record expense", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("Date", language)}</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Category", language)}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.label, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Amount (ETB)", language)}</Label>
                <Input type="number" min="0" placeholder="..." value={form.amount_etb} onChange={(e) => setForm({ ...form, amount_etb: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Supplier / note", language)} <span className="text-muted-foreground font-normal">({t("optional", language)})</span></Label>
                <Input placeholder="..." value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Save expense", language)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">{t("Recent expenses", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 bg-muted/20 p-2.5 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Supplier / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
                {filteredExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">{t("No entries yet", language)}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                        <tr>
                          <th className="p-3">{t("Date", language)}</th>
                          <th className="p-3">{t("Category", language)}</th>
                          <th className="p-3">{t("Supplier / Note", language)}</th>
                          <th className="p-3">{t("Recorded by", language)}</th>
                          <th className="p-3 text-right">{t("Amount", language)}</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredExpenses.map((ex) => (
                          <tr key={ex.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 whitespace-nowrap">{formatDate(ex.expense_date)}</td>
                            <td className="p-3 whitespace-nowrap">
                              <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5 font-normal capitalize">
                                {ex.category}
                              </Badge>
                            </td>
                            <td className="p-3 truncate max-w-[150px]">{ex.supplier || "—"}</td>
                            <td className="p-3 truncate max-w-[120px] text-muted-foreground">{ex.recorded_by_name}</td>
                            <td className="p-3 text-right font-semibold text-[hsl(var(--expense))] whitespace-nowrap">
                              -{formatETB(Number(ex.amount_etb))}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-0.5">
                                {(user?.role === "owner" || ex.recorded_by === user?.id) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingExpense(ex);
                                      setEditForm({
                                        expense_date: ex.expense_date.split("T")[0],
                                        category: ex.category,
                                        amount_etb: String(ex.amount_etb),
                                        supplier: ex.supplier || "",
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
                                    onClick={() => setDeletingExpense(ex)}
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
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Edit Expense</h3>
              <p className="text-sm text-muted-foreground">Modify recorded data for this expense.</p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_exp_date">Date</Label>
                <Input
                  id="edit_exp_date"
                  type="date"
                  value={editForm.expense_date}
                  onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_category">Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger id="edit_category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_exp_amt">Amount (ETB)</Label>
                <Input
                  id="edit_exp_amt"
                  type="number"
                  min="0"
                  value={editForm.amount_etb}
                  onChange={(e) => setEditForm({ ...editForm, amount_etb: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_supplier">Supplier / note</Label>
                <Input
                  id="edit_supplier"
                  value={editForm.supplier}
                  onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingExpense(null)}
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
      {deletingExpense && (
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
                onClick={() => setDeletingExpense(null)}
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
