"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import type { Sale } from "@/types";
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
import { Loader2, Plus, Edit2, Trash2, MoreHorizontal, ChevronDown, Eye } from "lucide-react";
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
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
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
        title: t("Sale recorded", language),
        description: `${formatETB(Number(form.amount_etb))} ${t("sale saved", language)}.`,
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
        title: t("Failed to save", language),
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
        title: t("Sale updated", language),
        description: t("Sale changes saved successfully.", language),
      });
      setEditingSale(null);
      fetchSales();
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
    if (!deletingSale) return;
    setDeleting(true);
    try {
      await api.delete(`/sales/${deletingSale.id}`);
      toast({
        title: t("Sale deleted", language),
        description: t("The sale record has been deleted.", language),
      });
      setDeletingSale(null);
      fetchSales();
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
              {sales.length} {t("sales recorded", language)}
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
                {t("Search buyer or type...", language)}
              </Label>
              <Input
                placeholder={t("Search buyer or type...", language)}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs bg-card"
              />
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
                  {t("Clear", language)}
                </Button>
              ) : (
                <div className="h-9" />
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground px-6 py-2 border-b border-border/50">
            {t("This month", language)}: ETB {formatETB(totalMonth)} {t("total across", language)} {monthCount}{" "}
            {t("sales", language)}
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
                            ? t("No sales match your filters. Try clearing them.", language)
                            : t("No sales recorded yet. Add your first sale.", language)}
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
                        <th className="py-3 px-4 text-right">{t("Quantity", language)}</th>
                        <th className="py-3 px-4 text-right">{t("Amount (ETB)", language)}</th>
                        <th className="py-3 px-4">{t("Buyer", language)}</th>
                        <th className="py-3 px-4">{t("Recorded by", language)}</th>
                        {user?.role === "owner" && (
                          <th className="py-3 px-4 text-center">{t("Action", language)}</th>
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
                              {formatDate(sale.sale_date, language)}
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
                                {t(sale.type, language)}
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs font-medium"
                                    >
                                      {t("Options", language)} <ChevronDown className="ml-1.5 w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{t("Actions", language)}</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setViewingSale(sale)}>
                                      <Eye className="mr-2 w-4 h-4" />
                                      {t("View Details", language)}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setEditingSale(sale);
                                      setEditForm({
                                        sale_date: sale.sale_date.split('T')[0],
                                        type: sale.type,
                                        quantity: sale.quantity.toString(),
                                        amount_etb: sale.amount_etb.toString(),
                                        buyer: sale.buyer || ""
                                      });
                                    }}>
                                      <Edit2 className="mr-2 w-4 h-4" />
                                      {t("Edit", language)}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeletingSale(sale)}
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                    >
                                      <Trash2 className="mr-2 w-4 h-4" />
                                      {t("Delete", language)}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

      {/* New Sale Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("New sale", language)}</DialogTitle>
            <DialogDescription>Record a new sale entry.</DialogDescription>
          </DialogHeader>
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
                {t("Save sale", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Sale", language)}</DialogTitle>
            <DialogDescription>{t("Modify recorded data for this sale.", language)}</DialogDescription>
          </DialogHeader>
          {editingSale && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_sale_date">{t("Date", language)}</Label>
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
                <Label htmlFor="edit_type">{t("Type", language)}</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                >
                  <SelectTrigger id="edit_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eggs">{t("Eggs", language)}</SelectItem>
                    <SelectItem value="broiler">{t("Broiler chickens", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_qty">{t("Quantity", language)}</Label>
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
                  <Label htmlFor="edit_amt">{t("Amount (ETB)", language)}</Label>
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
                <Label htmlFor="edit_buyer">{t("Buyer", language)}</Label>
                <Input
                  id="edit_buyer"
                  value={editForm.buyer}
                  onChange={(e) =>
                    setEditForm({ ...editForm, buyer: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingSale(null)}
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
      <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Sale Details", language)}</DialogTitle>
            <DialogDescription>{t("Detailed information for this sale record.", language)}</DialogDescription>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Date", language)}</span>
                <span className="text-sm font-medium">{formatDate(viewingSale.sale_date, language)}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Type", language)}</span>
                <span className="text-sm font-medium capitalize">
                  <Badge variant="outline">{t(viewingSale.type, language)}</Badge>
                </span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Quantity", language)}</span>
                <span className="text-sm font-medium">{viewingSale.quantity}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Amount (ETB)", language)}</span>
                <span className="text-sm font-bold text-[hsl(var(--revenue))]">{formatETB(viewingSale.amount_etb)}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Buyer", language)}</span>
                <span className="text-sm font-medium">{viewingSale.buyer || "—"}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("Recorded by", language)}</span>
                <span className="text-sm font-medium">{viewingSale.recorded_by_name || t("System", language)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSale} onOpenChange={(open) => !open && setDeletingSale(null)}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
