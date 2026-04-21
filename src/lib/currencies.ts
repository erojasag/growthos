export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: "CRC", symbol: "₡", name: "Costa Rican Colón", locale: "es-CR" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX" },
];

export const DEFAULT_CURRENCY = "CRC";

export function getCurrency(code: string): CurrencyConfig {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatMoney(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const config = getCurrency(currencyCode);
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.code === "CRC" ? 0 : 2,
    maximumFractionDigits: config.code === "CRC" ? 0 : 2,
  }).format(amount);
}

export interface ExchangeRateData {
  compra: number;
  venta: number;
}

export function convertToTarget(
  amount: number,
  from: string,
  to: string,
  rate: ExchangeRateData | null
): number {
  if (from === to || !rate) return amount;
  if (from === "USD" && to === "CRC") return amount * rate.venta;
  if (from === "CRC" && to === "USD") return amount / rate.compra;
  return amount;
}

export function getDaysUntilIncomeEdit(incomeUpdatedAt: string): number {
  const updated = new Date(incomeUpdatedAt);
  const nextAllowed = new Date(updated);
  nextAllowed.setDate(nextAllowed.getDate() + 30);
  const now = new Date();
  const diff = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
