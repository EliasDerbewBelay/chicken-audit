"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/translations";
import type { Language } from "@/lib/translations";

export interface EggDayPoint {
  date: string;
  count: number;
}

interface EggProductionChartProps {
  data: EggDayPoint[];
  language: Language;
  className?: string;
}

export function EggProductionChart({
  data,
  language,
  className = "h-full min-h-[200px]",
}: EggProductionChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 14, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.06)"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => {
              try {
                return new Date(d).toLocaleDateString(
                  language === "am" ? "am-ET" : "en-ET",
                  {
                    calendar: language === "am" ? "ethiopic" : undefined,
                    weekday: "short",
                  },
                );
              } catch {
                return d;
              }
            }}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickMargin={6}
          />
          <YAxis
            domain={[0, "auto"]}
            width={32}
            tickCount={4}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(v: number) => [`${v} ${t("eggs", language)}`, ""]}
            labelFormatter={(d) => formatDate(d, language)}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            maxBarSize={48}
            minPointSize={6}
          >
            <LabelList
              dataKey="count"
              position="top"
              style={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 500,
              }}
            />
            {data.map((_, i, arr) => (
              <Cell
                key={i}
                fill={
                  i === arr.length - 1
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.35)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
