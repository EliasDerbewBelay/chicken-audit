"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const EXPENSE_CATEGORIES = [
  { key: "feed", label: "Feed" },
  { key: "medicine", label: "Medicine" },
  { key: "vaccine", label: "Vaccine" },
  { key: "wage", label: "Wage" },
  { key: "utilities", label: "Utilities" },
  { key: "equipment", label: "Equipment" },
  { key: "other", label: "Other" },
];

type FarmSettings = {
  starting_flock?: string;
};

export function FarmSettingsForm() {
  const { toast } = useToast();
  const [startingFlock, setStartingFlock] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<FarmSettings>("/settings")
      .then((data) => {
        if (data.starting_flock !== undefined && data.starting_flock !== null) {
          setStartingFlock(String(data.starting_flock));
        }
      })
      .catch((err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to load settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const flockValue = Number(startingFlock);
    if (Number.isNaN(flockValue) || flockValue < 0) {
      toast({ variant: "destructive", title: "Invalid value", description: "Starting flock must be a valid non-negative number." });
      return;
    }

    setSaving(true);
    try {
      await api.put("/settings", { starting_flock: flockValue });
      toast({ title: "Settings saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Unable to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Flock Configuration</h3>
          <p className="text-sm text-muted-foreground">Set the initial number of chickens your farm started with. This is used to calculate your current active flock count.</p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="starting_flock">Starting Flock Count</Label>
            <Input
              id="starting_flock"
              type="number"
              min={0}
              value={startingFlock}
              onChange={(e) => setStartingFlock(e.target.value)}
              placeholder="e.g. 200"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div>
          <h3 className="text-lg font-medium">Expense Categories</h3>
          <p className="text-sm text-muted-foreground">These are the pre-defined expense categories used across the system. They cannot be modified at this time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <Badge key={cat.key} variant="secondary" className="text-sm py-1.5 px-3 capitalize">
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
