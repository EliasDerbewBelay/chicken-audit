import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatETB(amount: number | null | undefined) {
  if (amount == null) return "ETB 0";
  const num = Number(amount);
  return `ETB ${(isNaN(num) ? 0 : num).toLocaleString("en-ET", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(dateStr: string | null | undefined, language: "en" | "am" = "en") {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (language === "am") {
    return date.toLocaleDateString("am-ET", {
      calendar: "ethiopic",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-ET", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
