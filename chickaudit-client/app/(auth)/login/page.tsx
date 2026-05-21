"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { Feather, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast({
        variant: "destructive",
        title: t("Login failed", language),
        description: t("Please enter both email and password.", language),
      });
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, trimmedPassword);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("Login failed", language), description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-sidebar-bg flex-col justify-between p-12 text-white border-r border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] flex items-center justify-center shadow-md">
              <Feather className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-2xl tracking-tight">ChickAudit</span>
          </div>
        </div>

        <div className="max-w-md my-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            የዶሮ እርሻ አስተዳደር
          </h1>
          <p className="text-lg text-sidebar-fg/80 leading-relaxed font-light">
            Poultry farm management built for professional agricultural enterprises.
          </p>
        </div>

        <div className="text-sm text-sidebar-fg/50 font-light">
          &copy; {new Date().getFullYear()} ChickAudit Enterprise. All rights reserved.
        </div>
      </div>

      {/* Right side (Mobile & Desktop Form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Logo (Mobile only) */}
          <div className="flex flex-col items-center justify-center gap-3 md:hidden">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Feather className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">ChickAudit</h1>
            <p className="text-xs text-muted-foreground">Family poultry farm management</p>
          </div>

          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t("Sign in", language)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Family poultry farm management", language)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FloatingInput
              id="email"
              type="email"
              label={t("Email", language)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <FloatingInput
              id="password"
              type="password"
              label={t("Password", language)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md bg-primary hover:bg-primary/90 transition-all" disabled={loading}>
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {t("Sign in", language)}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
