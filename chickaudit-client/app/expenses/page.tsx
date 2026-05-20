"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import { PageHeader } from "@/components/app/page-header";
import { FloatingInput } from "@/components/ui/floating-input";
import { cn } from "@/lib/utils";

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

  // Swipe-to-delete state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

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
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("Expenses", language)}
        subtitle={`${t("This month", language)}: ${formatETB(totalMonth)}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Plus className="w-4 h-4 text-primary" />
              {t("Record expense", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                type="date"
                label={t("Date", language)}
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Category", language)}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.label, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FloatingInput
                type="number"
                min="0"
                placeholder="..."
                label={t("Amount (ETB)", language)}
                value={form.amount_etb}
                onChange={(e) => setForm({ ...form, amount_etb: e.target.value })}
                required
              />
              <FloatingInput
                placeholder="..."
                label={`${t("Supplier / note", language)} (${t("optional", language)})`}
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
              <div className="md:static sticky-save mt-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Save expense", language)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">{t("Recent expenses", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4 bg-muted/40 p-3 rounded-xl border border-border mx-4 sm:mx-0">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Supplier / recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs bg-card"><SelectValue /></SelectTrigger>
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
                {filteredExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">{t("No entries yet", language)}</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
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
                        <tbody className="divide-y divide-border bg-card">
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
                                <div className="flex items-center justify-center gap-1">
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

                    {/* Mobile Card List View */}
                    <div className="md:hidden space-y-2">
                      {filteredExpenses.map((ex) => (
                        <div
                          key={ex.id}
                          className="relative overflow-hidden bg-card rounded-xl border border-border shadow-sm group"
                          onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                          }}
                          onTouchMove={(e) => {
                            const diff = touchStart.current - e.touches[0].clientX;
                            if (diff > 50) setSwipedId(ex.id);
                            if (diff < -50) setSwipedId(null);
                          }}
                        >
                          <div
                            className={cn(
                              "p-4 flex items-center justify-between transition-transform duration-200 bg-card z-10 relative",
                              swipedId === ex.id && "-translate-x-[110px]"
                            )}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {formatDate(ex.expense_date)}
                                </span>
                                <Badge variant="secondary" className="text-[9px] font-normal leading-none py-0.5 px-1 bg-muted border-none text-muted-foreground">
                                  {ex.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {ex.supplier ? ex.supplier : "Farm purchase"} · {ex.recorded_by_name}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <span className="text-xs font-bold text-[hsl(var(--expense))]">
                                -{formatETB(Number(ex.amount_etb))}
                              </span>
                            </div>
                          </div>

                          {/* Actions drawer (slides out) */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center z-0 bg-muted">
                            {(user?.role === "owner" || ex.recorded_by === user?.id) && (
                              <button
                                onClick={() => {
                                  setSwipedId(null);
                                  setEditingExpense(ex);
                                  setEditForm({
                                    expense_date: ex.expense_date.split("T")[0],
                                    category: ex.category,
                                    amount_etb: String(ex.amount_etb),
                                    supplier: ex.supplier || "",
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
                                  setDeletingExpense(ex);
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
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
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
