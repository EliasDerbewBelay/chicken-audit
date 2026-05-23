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
  Settings,
  Bird,
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
  { href: "/chickens", label: "Chickens", icon: Bird },
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
    items.push({ href: "/settings", label: "Settings", icon: Settings });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: t("Mismatch", language), description: t("Passwords do not match.", language) });
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/users/${user.id}/password`, { password: newPassword });
      toast({ title: t("Password updated", language), description: t("Your password has been changed successfully.", language) });
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("Failed to update password", language), description: err.message });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[64px] lg:w-[220px] bg-sidebar-bg flex flex-col z-30 border-r border-white/5 transition-all duration-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 lg:px-5 py-5 border-b border-white/5 justify-center lg:justify-start">
          <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Feather className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-serif font-bold text-2xl text-white hidden lg:block tracking-tight">ChickAudit</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3.5 py-3 px-3.5 lg:px-5 text-sm transition-all border-l-[3px] w-full justify-center lg:justify-start",
                  active
                    ? "border-l-[#4ade80] bg-white/10 text-white font-medium"
                    : "border-l-transparent text-sidebar-fg hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden lg:block truncate">{t(label, language)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language selector */}
        <div className="px-2 lg:px-4 pb-4">
          <div className="flex flex-col lg:flex-row bg-white/5 p-1 rounded-lg gap-1">
            <button
              onClick={() => setLanguage("en")}
              className={cn(
                "flex-1 py-1 rounded-md text-[10px] lg:text-xs font-semibold transition-all",
                language === "en" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-sidebar-fg/60 hover:text-white"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("am")}
              className={cn(
                "flex-1 py-1 rounded-md text-[10px] lg:text-xs font-semibold transition-all",
                language === "am" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-sidebar-fg/60 hover:text-white"
              )}
            >
              አማ
            </button>
          </div>
        </div>

        {/* User footer */}
        <div className="p-3 lg:p-4 border-t border-white/5">
          <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.full_name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className="text-[13px] font-medium text-white truncate leading-tight">{user?.full_name}</p>
                <p className="text-[11px] text-sidebar-fg/50 capitalize mt-0.5">{user?.role}</p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-0.5 items-center">
              <button
                onClick={() => setShowChangePassword(true)}
                className="p-1.5 text-sidebar-fg hover:text-white rounded-md hover:bg-white/5"
                title="Change password"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 text-sidebar-fg hover:text-white rounded-md hover:bg-white/5"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">{t("Change Password", language)}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Update the password for your account.", language)}
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_new_password">{t("New Password", language)}</Label>
                <Input
                  id="sidebar_new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("Min 6 characters", language)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_confirm_password">{t("Confirm New Password", language)}</Label>
                <Input
                  id="sidebar_confirm_password"
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
                    setShowChangePassword(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={updating}
                >
                  {t("Cancel", language)}
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("Change password", language)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
