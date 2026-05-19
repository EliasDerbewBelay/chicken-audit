"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Receipt,
  Heart,
  LogOut,
  Feather,
  Users,
  Key,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-log", label: "Daily log", icon: ClipboardList },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/health", label: "Health", icon: Heart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const items = [...navItems];
  if (user?.role === "owner") {
    items.push({ href: "/users", label: "Users", icon: Users });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/users/${user.id}/password`, { password: newPassword });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update password", description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-56 border-r border-border bg-card flex flex-col z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Feather className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg text-foreground">ChickAudit</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t(label, language)}
              </Link>
            );
          })}
        </nav>

        {/* Language selector */}
        <div className="px-4 pb-4">
          <div className="flex bg-muted/50 p-1 rounded-md gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage("en")}
              className={cn("flex-1 h-7 text-xs", language === "en" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              EN
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage("am")}
              className={cn("flex-1 h-7 text-xs", language === "am" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              አማ
            </Button>
          </div>
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-foreground">
              {user?.full_name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground mb-1 text-xs"
            onClick={() => setShowChangePassword(true)}
          >
            <Key className="w-3.5 h-3.5 mr-2" />
            Change password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            {t("Sign out", language)}
          </Button>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Change Password</h3>
              <p className="text-sm text-muted-foreground">
                Update the password for your account.
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_new_password">New Password</Label>
                <Input
                  id="sidebar_new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_confirm_password">Confirm New Password</Label>
                <Input
                  id="sidebar_confirm_password"
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
                    setShowChangePassword(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Change password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
