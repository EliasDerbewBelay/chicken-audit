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

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-ET", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
