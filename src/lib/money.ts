import { LEDGER, MICROS } from "./config";

/** Bond rule, mirrored from the contract: 10% of the amount, floor MIN_BOND. */
export function bondFor(amountMicros: number, bondBps = 1000, minBond = 5_000_000): number {
  return Math.max(Math.floor((amountMicros * bondBps) / 10_000), minBond);
}

/** Micro-units → human string with two decimals, e.g. 12_500_000 → "12.50". */
export function fmtAmount(micros: number, digits = 2): string {
  const v = micros / MICROS;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtMoney(micros: number, digits = 2): string {
  return `${fmtAmount(micros, digits)} ${LEDGER.symbol}`;
}

export function fmtCompact(micros: number): string {
  const v = micros / MICROS;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k ${LEDGER.symbol}`;
  return fmtMoney(micros);
}

/** "12.5" → 12_500_000 micro-units. Returns null on invalid input. */
export function parseAmount(text: string): number | null {
  const t = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * MICROS);
}

export const usdUnit = LEDGER.symbol;
