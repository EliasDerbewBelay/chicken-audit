import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;           // e.g. "Eggs today" — uppercase 11px tracking-wide muted
  value: string | number;  // displayed in Instrument Serif italic, 32px, foreground
  trend?: {
    value: number;         // e.g. +6 or -3
    label: string;         // e.g. "vs yesterday"
  };
  description?: string;    // fallback descriptive text
  color?: "default" | "revenue" | "expense" | "neutral";
  icon?: LucideIcon;
  stagger?: number;        // 1–4 for animation delay
}

export function KpiCard({
  label,
  value,
  trend,
  description,
  color = "default",
  icon: Icon,
  stagger,
}: KpiCardProps) {
  const valueColorClass = {
    default: "text-foreground",
    revenue: "text-[hsl(var(--revenue))]",
    expense: "text-[hsl(var(--expense))]",
    neutral: "text-muted-foreground",
  }[color];

  return (
    <Card
      className={cn(
        "bg-card border border-border rounded-xl transition-all duration-200 hover:shadow-card-hover min-h-[140px] flex flex-col justify-between",
        stagger && `animate-fade-in stagger-${stagger}`
      )}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mt-1">
              {label}
            </span>
            {Icon && (
              <div className="p-2 rounded-full text-muted-foreground bg-muted/20">
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className={cn("font-serif text-3xl md:text-4xl leading-none font-bold", valueColorClass)}>
              {value}
            </p>

        {trend ? (
          <div className="flex items-center gap-1 mt-2.5 text-[11px] font-medium">
            {trend.value >= 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-[hsl(var(--net-positive))]" />
                <span className="text-[hsl(var(--net-positive))]">
                  +{trend.value}
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-[hsl(var(--net-negative))]" />
                <span className="text-[hsl(var(--net-negative))]">
                  {trend.value}
                </span>
              </>
            )}
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        ) : description ? (
          <p className="text-[11px] text-muted-foreground mt-2.5 font-medium leading-none">
            {description}
          </p>
        ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
