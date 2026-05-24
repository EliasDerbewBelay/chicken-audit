"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { Download, Loader2, FileText, ShoppingCart, Receipt } from "lucide-react";
import { getUrl } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("chickenaudit_token");
}

const EXPORTS = [
  {
    key: "logs",
    label: "Daily Logs",
    description: "Export all daily egg collection, feed, and death records.",
    icon: FileText,
    filename: "daily_logs.csv",
  },
  {
    key: "sales",
    label: "Sales Records",
    description: "Export all egg and broiler sales with amounts.",
    icon: ShoppingCart,
    filename: "sales.csv",
  },
  {
    key: "expenses",
    label: "Expense Records",
    description: "Export all farm expenses by category.",
    icon: Receipt,
    filename: "expenses.csv",
  },
];

export function DataExportPanel() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(key: string, filename: string) {
    setDownloading(key);
    try {
      const token = getToken();
      const res = await fetch(getUrl(`/export/${key}`), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Download started", description: `${filename} is being downloaded.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export failed", description: err.message });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Data Export</h3>
        <p className="text-sm text-muted-foreground">Download your farm data as CSV files for external accounting and analysis.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((exp) => {
          const Icon = exp.icon;
          const isLoading = downloading === exp.key;
          return (
            <div
              key={exp.key}
              className="group relative rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{exp.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-2"
                onClick={() => handleDownload(exp.key, exp.filename)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download CSV
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
