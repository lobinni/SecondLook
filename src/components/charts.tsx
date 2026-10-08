"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

/* Hand-drawn SVG charts on the paper grid — no chart library. */

export function Donut({
  parts,
  size = 148,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  parts: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7ece6" strokeWidth={thickness} />
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const len = (p.value / total) * c;
            const el = (
              <circle
                key={p.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        <g className="rotate-90" style={{ transformOrigin: "center" }}>
          {centerValue && (
            <text x="50%" y="47%" textAnchor="middle" className="fill-ink" fontSize="22" fontWeight="800">
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x="50%" y="60%" textAnchor="middle" className="fill-fog" fontSize="9" fontWeight="700" letterSpacing="1.5">
              {centerLabel.toUpperCase()}
            </text>
          )}
        </g>
      </svg>
      <div className="space-y-1.5">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 shrink-0" style={{ background: p.color }} />
            <span className="text-fog">{p.label}</span>
            <span className="font-extrabold text-ink ml-auto pl-3">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bars({
  data,
  height = 150,
  className,
}: {
  data: { label: string; value: number; hint?: string; color?: string }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full min-w-0 group">
            <span className="text-[10px] font-extrabold text-ink opacity-0 group-hover:opacity-100 transition-opacity">
              {d.hint ?? d.value}
            </span>
            <div
              className="w-full max-w-10 transition-all duration-500 border border-ink/15"
              style={{ height: `${(d.value / max) * 100}%`, background: d.color ?? "#35d5b4", minHeight: d.value > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] font-bold text-fog truncate uppercase tracking-wider">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simple area sparkline for cumulative counters. */
export function Trend({
  points,
  height = 120,
  label,
}: {
  points: { x: string; y: number }[];
  height?: number;
  label: string;
}) {
  const { path, area } = useMemo(() => {
    if (points.length === 0) return { path: "", area: "" };
    const w = 320;
    const maxY = Math.max(1, ...points.map((p) => p.y));
    const step = w / Math.max(1, points.length - 1);
    const coords = points.map((p, i) => [i * step, height - 8 - (p.y / maxY) * (height - 20)] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    return { path: line, area: `${line} L${w},${height} L0,${height} Z` };
  }, [points, height]);

  return (
    <div>
      <svg viewBox={`0 0 320 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#35d5b4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#35d5b4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="#087f71" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[10px] font-bold text-fog uppercase tracking-wider mt-2">
        <span>{points[0]?.x ?? ""}</span>
        <span className="text-pine">{label}</span>
        <span>{points[points.length - 1]?.x ?? ""}</span>
      </div>
    </div>
  );
}
