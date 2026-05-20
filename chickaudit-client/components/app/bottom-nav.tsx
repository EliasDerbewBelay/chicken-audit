import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  MoreHorizontal,
  Receipt,
  Heart,
  Key,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { api } from "@/lib/api";

export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const isTabActive = (href: string) => {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  };

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mismatch",
        description: "Passwords do not match.",
      });
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/users/${user.id}/password`, { password: newPassword });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to update password",
        description: err.message,
      });
    } finally {
      setUpdating(false);
    }
  }

  const tabs = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/daily-log", label: "Daily log", icon: ClipboardList },
    { href: "/sales", label: "Sales", icon: ShoppingCart },
  ];

  return (
    <>
      {/* Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-card border-t border-border flex items-center justify-around z-40 shadow-bottom-nav pb-[env(safe-area-inset-bottom)] box-content">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full border-t-2 border-transparent transition-all",
                active ? "border-primary text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{t(label, language)}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full border-t-2 border-transparent transition-all",
            isMoreOpen || isTabActive("/expenses") || isTabActive("/health")
              ? "border-primary text-primary font-medium"
              : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t("More", language)}</span>
        </button>
      </nav>

      {/* "More" Drawer Slide Up */}
      {isMoreOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-xl z-50 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] drawer-enter md:hidden shadow-lg">
            {/* Grabber line */}
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-5" />

            <div className="space-y-1">
              <Link
                href="/expenses"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm transition-colors",
                  isTabActive("/expenses")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Receipt className="w-5 h-5 text-muted-foreground" />
                {t("Expenses", language)}
              </Link>

              <Link
                href="/health"
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm transition-colors",
                  isTabActive("/health")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Heart className="w-5 h-5 text-muted-foreground" />
                {t("Health", language)}
              </Link>

              {user?.role === "owner" && (
                <Link
                  href="/users"
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm transition-colors",
                    isTabActive("/users")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  {t("Users", language) || "Users"}
                </Link>
              )}

              <hr className="border-border my-2.5" />

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  setShowChangePassword(true);
                }}
                className="flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm text-foreground w-full text-left hover:bg-muted"
              >
                <Key className="w-5 h-5 text-muted-foreground" />
                {t("Change password", language) || "Change password"}
              </button>

              <div className="py-2 px-3">
                <div className="flex bg-muted p-1 rounded-lg gap-1 w-full">
                  <button
                    onClick={() => setLanguage("en")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                      language === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage("am")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                      language === "am" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    አማ
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm text-destructive w-full text-left hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5 text-destructive" />
                {t("Sign out", language)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">Change Password</h3>
              <p className="text-sm text-muted-foreground">
                Update the password for your account.
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bottom_new_password">New Password</Label>
                <Input
                  id="bottom_new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bottom_confirm_password">Confirm New Password</Label>
                <Input
                  id="bottom_confirm_password"
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
