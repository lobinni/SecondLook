"use client";

import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/config";
import { cn } from "@/lib/cn";

/* ── status + verdict badges ──────────────────────────────────────────── */

const STATUS_STYLE: Record<string, { label: string; cls: string; dot?: string }> = {
  open: { label: "Open", cls: "border-pine/40 text-pine bg-mist" },
  challenged: { label: "Challenged", cls: "border-amber/60 text-[#9c6517] bg-[#fdf2e2]" },
  cleared: { label: "Cleared", cls: "border-pine/40 text-pine bg-mist" },
  final: { label: "Final", cls: "border-ink/25 text-ink bg-meadow" },
  reverted: { label: "Reverted", cls: "border-clay/50 text-clay bg-[#f9e9e4]" },
  pending: { label: "Pending", cls: "border-amber/60 text-[#9c6517] bg-[#fdf2e2]" },
  upheld: { label: "Upheld", cls: "border-pine/50 text-pine bg-mist" },
  rejected: { label: "Rejected", cls: "border-clay/50 text-clay bg-[#f9e9e4]" },
  appealed: { label: "Appealed", cls: "border-amber/60 text-[#9c6517] bg-[#fdf2e2]" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, cls: "border-ink/25 text-ink bg-meadow" };
  return <span className={cn("verdict-badge", s.cls)}>{s.label}</span>;
}

export function VerdictBadge({ label }: { label: string }) {
  if (!label) return null;
  const cls =
    label === "MISMATCH"
      ? "border-clay/50 text-clay bg-[#f9e9e4]"
      : label === "MATCH"
        ? "border-pine/50 text-pine bg-mist"
        : "border-ink/30 text-fog bg-meadow";
  return <span className={cn("verdict-badge", cls)}>{label}</span>;
}

/* ── stat blocks ──────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  sub,
  night,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  night?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-5 py-4 border",
        night ? "hairline-night bg-[#0a1a15]" : "hairline bg-paper",
      )}
    >
      <div className={cn("label-micro mb-2", night ? "text-mint/70" : "text-fog")}>{label}</div>
      <div className={cn("text-2xl font-extrabold title-tight", night ? "text-paper" : "text-ink")}>
        {value}
      </div>
      {sub && <div className={cn("text-xs mt-1 font-medium", night ? "text-paper/50" : "text-fog")}>{sub}</div>}
    </div>
  );
}

/* ── address chip with copy ───────────────────────────────────────────── */

export function AddrChip({ addr, className }: { addr: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <a
        href={explorerAddressUrl(addr)}
        target="_blank"
        rel="noreferrer"
        className="mute-id hover:text-pine inline-flex items-center gap-1 border-b border-transparent hover:border-pine"
        title={addr}
      >
        {short}
        <ExternalLink className="w-3 h-3" />
      </a>
      <button
        type="button"
        aria-label="Copy address"
        className="text-fog hover:text-pine transition-colors"
        onClick={() => {
          navigator.clipboard?.writeText(addr).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-pine" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

export function TxLink({ hash, short = true }: { hash: string; short?: boolean }) {
  const label = short ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-pine font-semibold text-xs hover:underline underline-offset-2"
    >
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/* ── page scaffolding ─────────────────────────────────────────────────── */

export function PageHead({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold title-tight">{title}</h1>
        {hint && <p className="text-fog text-sm mt-2 max-w-2xl font-medium">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <div className="mx-auto mb-4 h-10 w-10 border border-ink/20 bg-mist shadow-edge-mint" />
      <h3 className="font-extrabold text-lg title-tight">{title}</h3>
      <p className="text-fog text-sm mt-2 max-w-md mx-auto font-medium">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin", className)} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-16 w-full border hairline" />
      ))}
    </div>
  );
}

/** Live-dot used next to “network ok” style labels. */
export function LiveDot({ tone = "mint" }: { tone?: "mint" | "amber" | "clay" }) {
  const bg = tone === "mint" ? "bg-mint" : tone === "amber" ? "bg-amber" : "bg-clay";
  return <span className={cn("inline-block w-2 h-2 animate-pulse-dot", bg)} />;
}

export function CardLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("card card-hover block", className)}>
      {children}
    </Link>
  );
}
