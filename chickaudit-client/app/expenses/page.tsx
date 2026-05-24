"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import type { Expense } from "@/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Plus, Edit2, Trash2, MoreHorizontal, ChevronDown, Eye } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { RecordActionsMenu } from "@/components/app/record-actions-menu";
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

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  feed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  medicine: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  vaccine: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  wage: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  utilities:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  equipment: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  other: "bg-muted text-muted-foreground",
};

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
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      const matchesSearch =
        searchTerm === "" ||
        (ex.supplier &&
          ex.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.category &&
          ex.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || ex.category === categoryFilter;

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
    api
      .get<Expense[]>("/expenses")
      .then(setExpenses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

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
      toast({
        title: t("Expense recorded", language),
        description: `${formatETB(Number(form.amount_etb))} ${t("expense saved", language)}.`,
      });
      setModalOpen(false);
      setForm({
        expense_date: new Date().toISOString().split("T")[0],
        category: "feed",
        amount_etb: "",
        supplier: "",
      });
      fetchExpenses();
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
    if (!editingExpense) return;
    setUpdating(true);
    try {
      await api.put(`/expenses/${editingExpense.id}`, {
        expense_date: editForm.expense_date,
        category: editForm.category,
        amount_etb: Number(editForm.amount_etb),
        supplier: editForm.supplier || null,
      });
      toast({
        title: t("Expense updated", language),
        description: t("Expense changes saved successfully.", language),
      });
      setEditingExpense(null);
      fetchExpenses();
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
    if (!deletingExpense) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deletingExpense.id}`);
      toast({
        title: t("Expense deleted", language),
        description: t("The expense record has been deleted.", language),
      });
      setDeletingExpense(null);
      fetchExpenses();
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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = filteredExpenses.filter((ex) =>
    ex.expense_date.startsWith(currentMonth),
  );
  const totalMonth = currentMonthExpenses.reduce(
    (sum, ex) => sum + Number(ex.amount_etb),
    0,
  );
  const monthCount = currentMonthExpenses.length;
  const categoryBreakdown = CATEGORIES.map((category) => ({
    category: category.value,
    label: category.label,
    amount: filteredExpenses
      .filter((ex) => ex.category === category.value)
      .reduce((sum, ex) => sum + Number(ex.amount_etb), 0),
  })).filter((entry) => entry.amount > 0);

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
      {/* Page Header */}
      <PageHeader
        title={t("Expenses", language)}
        subtitle={`${t("This month", language)}: ${formatETB(totalMonth)}`}
      />

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              {t("Expenses", language)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {expenses.length} {t("expenses recorded", language)}
            </p>
          </div>
          <Button className="h-11" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("New expense", language)}
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5 mb-4 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("Search supplier or category", language)}
              </Label>
              <Input
                placeholder={t("Search supplier or category...", language)}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("Category", language)}
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All", language)}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.label, language)}
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
              {searchTerm ||
              categoryFilter !== "all" ||
              startDate ||
              endDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
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
            {t("This month", language)}: ETB {formatETB(totalMonth)} {t("across", language)}{" "}
            {monthCount} {t("expenses", language)}
          </div>

          {categoryBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-border/50 text-xs text-muted-foreground">
              {categoryBreakdown.map((entry) => (
                <span
                  key={entry.category}
                  className="bg-muted rounded-full px-3 py-1"
                >
                  {t(entry.label, language)} ETB {formatETB(entry.amount)}
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
              {filteredExpenses.length === 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-full text-left border-collapse">
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-sm text-muted-foreground"
                        >
                          {searchTerm ||
                          categoryFilter !== "all" ||
                          startDate ||
                          endDate
                            ? t("No expenses match your filters.", language)
                            : t(
                                "No expenses yet. Add your first expense.",
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
                        <th className="py-3 px-4">{t("Category", language)}</th>
                        <th className="py-3 px-4 text-right">
                          {t("Amount", language)}
                        </th>
                        <th className="py-3 px-4">{t("Supplier", language)}</th>
                        <th className="py-3 px-4">
                          {t("Recorded by", language)}
                        </th>
                        <th className="py-3 px-4 text-center">{t("Action", language)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((ex, index) => {
                        const initials = ex.recorded_by_name
                          ? ex.recorded_by_name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0].toUpperCase())
                              .join("")
                          : "--";

                        return (
                          <tr
                            key={ex.id}
                            className={cn(
                              "group border-b border-border/50 hover:bg-muted/30 transition-colors",
                              index % 2 === 1 ? "bg-muted/10" : "",
                            )}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              {formatDate(ex.expense_date, language)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
                                  CATEGORY_BADGE_CLASSES[ex.category] ??
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {t(
                                  CATEGORIES.find((c) => c.value === ex.category)?.label || ex.category,
                                  language
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-[hsl(var(--expense))] tabular-nums whitespace-nowrap">
                              −ETB {formatETB(Number(ex.amount_etb))}
                            </td>
                            <td className="py-3 px-4 truncate max-w-[200px]">
                              {ex.supplier || "—"}
                            </td>
                            <td className="py-3 px-4 flex items-center gap-3 whitespace-nowrap">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center">
                                {initials}
                              </span>
                              <span className="text-sm text-foreground truncate max-w-[110px]">
                                {ex.recorded_by_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <RecordActionsMenu
                                recordOwnerId={ex.recorded_by}
                                language={language}
                                onView={() => setViewingExpense(ex)}
                                onEdit={() => {
                                  setEditingExpense(ex);
                                  setEditForm({
                                    expense_date: ex.expense_date.split("T")[0],
                                    category: ex.category,
                                    amount_etb: ex.amount_etb.toString(),
                                    supplier: ex.supplier || "",
                                  });
                                }}
                                onDelete={() => setDeletingExpense(ex)}
                              />
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

      {/* New Expense Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("New expense", language)}</DialogTitle>
            <DialogDescription>Record a new expense entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingInput
              type="date"
              label={t("Date", language)}
              value={form.expense_date}
              onChange={(e) =>
                setForm({ ...form, expense_date: e.target.value })
              }
              required
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("Category", language)}
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.label, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <FloatingInput
              placeholder="..."
              label={`${t("Supplier / note", language)} (${t("optional", language)})`}
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                {t("Cancel", language)}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Save expense", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Expense", language)}</DialogTitle>
            <DialogDescription>{t("Modify recorded data for this expense.", language)}</DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_exp_date">{t("Date", language)}</Label>
                <Input
                  id="edit_exp_date"
                  type="date"
                  value={editForm.expense_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expense_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_category">{t("Category", language)}</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, category: v })
                  }
                >
                  <SelectTrigger id="edit_category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {t(c.label, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_exp_amt">{t("Amount (ETB)", language)}</Label>
                <Input
                  id="edit_exp_amt"
                  type="number"
                  min="0"
                  value={editForm.amount_etb}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amount_etb: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_supplier">{t("Supplier / note", language)}</Label>
                <Input
                  id="edit_supplier"
                  value={editForm.supplier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, supplier: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingExpense(null)}
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
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Expense Details", language)}</DialogTitle>
            <DialogDescription>{t("Detailed information for this expense record.", language)}</DialogDescription>
          </DialogHeader>
          {viewingExpense && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Date", language)}</span>
                <span className="text-sm font-medium">{formatDate(viewingExpense.expense_date, language)}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Category", language)}</span>
                <span className="text-sm font-medium capitalize">
                  <Badge variant="outline">{t(viewingExpense.category, language)}</Badge>
                </span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Amount (ETB)", language)}</span>
                <span className="text-sm font-bold text-[hsl(var(--expense))]">{formatETB(viewingExpense.amount_etb)}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Supplier", language)}</span>
                <span className="text-sm font-medium">{viewingExpense.supplier || "—"}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Recorded by", language)}</span>
                <span className="text-sm font-medium">{viewingExpense.recorded_by_name || t("System", language)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> {t("Delete entry", language)}
            </DialogTitle>
            <DialogDescription>
              {t("You are about to permanently delete", language)}?{" "}
              {t("This cannot be undone", language)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
