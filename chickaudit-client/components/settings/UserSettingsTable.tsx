"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";
import { t } from "@/lib/translations";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import {
  Loader2,
  Key,
  UserPlus,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  User as UserIcon,
  Edit2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function UserSettingsTable() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "employee",
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    setLoading(true);
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch((err) => {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users.",
        });
      })
      .finally(() => setLoading(false));
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast({
        title: "User created",
        description: `${form.full_name} has been added.`,
      });
      setForm({ full_name: "", email: "", password: "", role: "employee" });
      setIsAddOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mismatch",
        description: "Passwords do not match.",
      });
      return;
    }

    setResetting(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, {
        password: newPassword,
      });
      toast({
        title: "Password updated",
        description: `Password for ${selectedUser.full_name} has been reset.`,
      });
      setIsResetOpen(false);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: err.message,
      });
    } finally {
      setResetting(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      await api.put(`/users/${editingUser.id}`, editForm);
      toast({
        title: t("Success", language),
        description: t("Settings saved", language),
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update user",
      });
    } finally {
      setUpdating(false);
    }
  }

  function openDeleteDialog(target: User) {
    if (target.role === "owner") return;
    if (target.id === currentUser?.id) {
      toast({
        variant: "destructive",
        title: t("Failed to delete", language),
        description: "You cannot delete your own account.",
      });
      return;
    }
    setDeletingUser(target);
  }

  async function handleConfirmDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast({
        title: t("User deleted", language),
        description: `${deletingUser.full_name} has been removed.`,
      });
      setDeletingUser(null);
      fetchUsers();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage farm accounts, reset passwords, and deactivate former
            employees.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={u.role === "owner" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium"
                      >
                        {t("Options", language)}{" "}
                        <ChevronDown className="ml-1.5 w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        {t("Actions", language)}
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setViewingUser(u)}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        {t("View Profile", language)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingUser(u);
                          setEditForm({
                            full_name: u.full_name,
                            email: u.email,
                            role: u.role,
                          });
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        {t("Edit User", language)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(u);
                          setIsResetOpen(true);
                        }}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {t("Reset password", language)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          openDeleteDialog(u);
                        }}
                        disabled={u.role === "owner" || u.id === currentUser?.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("Delete User", language)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isResetOpen}
        onOpenChange={(open) => {
          setIsResetOpen(open);
          if (!open) {
            setNewPassword("");
            setConfirmPassword("");
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetting}>
              {resetting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Profile Modal */}
      <Dialog
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Details for this account.
            </p>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Full Name</span>
                <span className="text-sm font-medium">
                  {viewingUser.full_name}
                </span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{viewingUser.email}</span>
              </div>
              <div className="grid grid-cols-2 py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium capitalize">
                  <Badge
                    variant={
                      viewingUser.role === "owner" ? "default" : "secondary"
                    }
                  >
                    {viewingUser.role}
                  </Badge>
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setViewingUser(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && !deleting && setDeletingUser(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {t("Delete User", language)}
            </DialogTitle>
            <DialogDescription>
              {t("You are about to permanently delete", language)}{" "}
              <span className="font-medium text-foreground">
                {deletingUser?.full_name}
              </span>
              ? {t("This cannot be undone", language)}.
              {deletingUser && (
                <>
                  <br />
                  <span className="text-xs">{deletingUser.email}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingUser(null)}
              disabled={deleting}
            >
              {t("Cancel", language)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Delete", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit User", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("Full Name", language)}</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Email", language)}</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Role", language)}</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm({ ...editForm, role: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    {t("Employee", language)}
                  </SelectItem>
                  <SelectItem value="owner">{t("Owner", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Save Changes", language)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
