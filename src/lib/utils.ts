import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = "CRC"): string {
  const isCRC = currencyCode === "CRC";
  return new Intl.NumberFormat(isCRC ? "es-CR" : "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: isCRC ? 0 : 2,
    maximumFractionDigits: isCRC ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getStreakCount(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates]
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff =
      (sorted[i].getTime() - sorted[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
