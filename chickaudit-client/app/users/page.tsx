"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { Loader2, Shield, Key, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { FloatingInput } from "@/components/ui/floating-input";

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New user form state
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee",
  });

  // Reset password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.push("/dashboard");
    } else if (user && user.role === "owner") {
      fetchUsers();
    }
  }, [user]);

  function fetchUsers() {
    setLoading(true);
    api.get<User[]>("/users")
      .then(setUsers)
      .catch((err) => {
        console.error(err);
        toast({ variant: "destructive", title: t("Error", language), description: t("Failed to load users.", language) });
      })
      .finally(() => setLoading(false));
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast({ title: t("User created", language), description: `${form.full_name} ${t("has been added.", language)}` });
      setForm({ full_name: "", email: "", password: "", role: "employee" });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: t("Failed to create user", language), description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: t("Mismatch", language), description: t("Passwords do not match.", language) });
      return;
    }

    setResetting(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      toast({ title: t("Password updated", language), description: `${t("Password for", language)} ${selectedUser.full_name} ${t("has been reset.", language)}` });
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("Failed to reset password", language), description: err.message });
    } finally {
      setResetting(false);
    }
  }

  if (!user || user.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Shield className="w-12 h-12 text-destructive animate-pulse" />
        <h2 className="text-xl font-bold">{t("Access Denied", language)}</h2>
        <p className="text-sm text-muted-foreground">{t("Only owners can access this page. Redirecting...", language)}</p>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Responsive Page Header */}
      <PageHeader
        title={t("Farm accounts", language)}
        subtitle={t("Manage credentials reset passwords and create accounts", language)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Create User Form */}
        <Card className="lg:col-span-2 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <UserPlus className="w-4 h-4 text-primary" />{t("Create new user", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-5">
              <FloatingInput
                id="full_name"
                placeholder="e.g. John Doe"
                label={t("Full Name", language)}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
              <FloatingInput
                id="email"
                type="email"
                placeholder="name@chickaudit.com"
                label={t("Email address", language)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <FloatingInput
                id="password"
                type="password"
                placeholder="Min 6 characters"
                label={t("Initial Password", language)}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("System Role", language)}</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="h-12 border-input bg-card rounded-xl text-base px-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t("Employee", language)}</SelectItem>
                    <SelectItem value="owner">{t("Owner", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:static sticky-save mt-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Add account", language)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="lg:col-span-3 rounded-xl border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">{t("Active users", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border bg-card">
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("No users found.", language)}</p>
                )}
                {users.map((u) => (
                  <div key={u.id} className="py-4 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                        <Badge
                          variant={u.role === "owner" ? "default" : "secondary"}
                          className={`text-[10px] py-0.5 px-2 rounded-full font-medium border-none capitalize`}
                        >
                          {t(u.role === "owner" ? "Owner" : "Employee", language)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(u)}
                      className="shrink-0 text-xs flex items-center gap-1.5 rounded-lg border-border hover:bg-muted"
                    >
                      <Key className="w-3.5 h-3.5" />
                      {t("Reset password", language)}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">{t("Reset password", language)}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Set a new password for", language)} <span className="font-semibold">{selectedUser.full_name}</span>.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">{t("New Password", language)}</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("Min 6 characters", language)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">{t("Confirm New Password", language)}</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("Verify password", language)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={resetting}
                >
                  {t("Cancel", language)}
                </Button>
                <Button type="submit" disabled={resetting}>
                  {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Save password", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}