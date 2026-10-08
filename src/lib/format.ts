/** Display helpers: addresses, clocks, countdowns, CSV. */

export function shortAddr(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 3) return addr ?? "";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function fmtClock(unixSec: number): string {
  if (!unixSec) return "—";
  return new Date(unixSec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fmtDate(unixSec: number): string {
  if (!unixSec) return "—";
  return new Date(unixSec * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2m 41s left" / "closed 3h ago" against `now` (unix seconds). */
export function countdown(target: number, now: number): string {
  const d = target - now;
  const abs = Math.abs(d);
  const label =
    abs >= 3600
      ? `${Math.floor(abs / 3600)}h ${Math.floor((abs % 3600) / 60)}m`
      : abs >= 60
        ? `${Math.floor(abs / 60)}m ${abs % 60}s`
        : `${abs}s`;
  return d >= 0 ? `${label} left` : `${label} ago`;
}

export function timeAgo(unixSec: number, now: number): string {
  return countdown(unixSec, now).replace(" left", "");
}

export function isLive(url: string): boolean {
  return /^https:\/\//.test(url);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Build a CSV string from rows; every cell is quoted. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
