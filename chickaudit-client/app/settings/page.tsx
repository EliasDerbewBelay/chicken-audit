"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

type FarmSettings = {
  starting_flock?: string;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [startingFlock, setStartingFlock] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (!user || !isOwner) {
      setLoading(false);
      return;
    }

    api
      .get<FarmSettings>("/settings")
      .then((data) => {
        if (data.starting_flock !== undefined && data.starting_flock !== null) {
          setStartingFlock(String(data.starting_flock));
        }
      })
      .catch((err: any) => {
        setError(err?.message || "Failed to load settings.");
      })
      .finally(() => setLoading(false));
  }, [user, isOwner]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const flockValue = Number(startingFlock);
    if (Number.isNaN(flockValue) || flockValue < 0) {
      setError(t("Starting flock must be a valid non-negative number.", language));
      return;
    }

    setSaving(true);
    try {
      await api.put("/settings", { starting_flock: flockValue });
      toast({ title: t("Settings saved", language) });
    } catch (err: any) {
      setError(err?.message || t("Unable to save settings.", language));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Farm Settings", language)}
        subtitle={t("Manage your farm configuration", language)}
      />

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-border bg-card px-6 py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Access denied", language)}</CardTitle>
            <CardDescription>
              {t("Only the farm owner can view and update settings on this page.", language)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Settings", language)}</CardTitle>
              <CardDescription>
                {t(
                  "The total number of chickens your farm started with",
                  language,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="startingFlock">
                    {t("Starting flock count", language)}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "The total number of chickens your farm started with",
                      language,
                    )}
                  </span>
                </div>
                <Input
                  id="startingFlock"
                  type="number"
                  min={0}
                  value={startingFlock}
                  onChange={(event) => setStartingFlock(event.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {t("Update", language)}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
