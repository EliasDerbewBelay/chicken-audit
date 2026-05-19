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
import { Loader2, Plus, Key, Shield, UserX, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";

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
        toast({ variant: "destructive", title: "Error", description: "Failed to load users." });
      })
      .finally(() => setLoading(false));
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast({ title: "User created", description: `${form.full_name} has been added.` });
      setForm({ full_name: "", email: "", password: "", role: "employee" });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create user", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
      return;
    }

    setResetting(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      toast({ title: "Password updated", description: `Password for ${selectedUser.full_name} has been reset.` });
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to reset password", description: err.message });
    } finally {
      setResetting(false);
    }
  }

  if (!user || user.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Shield className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">Only owners can access this page. Redirecting...</p>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground">{t("Farm accounts", language)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("Manage credentials reset passwords and create accounts", language)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Create User Form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" />{t("Create new user", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">{t("Full Name", language)}</Label>
                <Input
                  id="full_name"
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("Email address", language)}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@chickaudit.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("Initial Password", language)}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">{t("System Role", language)}</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t("Employee", language)}</SelectItem>
                    <SelectItem value="owner">{t("Owner", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Add account", language)}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">{t("Active users", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
                )}
                {users.map((u) => (
                  <div key={u.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                        <Badge
                          variant={u.role === "owner" ? "default" : "secondary"}
                          className={`text-xs capitalize ${
                            u.role === "owner"
                              ? "bg-[hsl(var(--primary))] text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {t(u.role === "owner" ? "Owner" : "Employee", language)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(u)}
                      className="shrink-0 text-xs flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">{t("Reset password", language)}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Set a new password for", language)} <span className="font-semibold">{selectedUser.full_name}</span>.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password"
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