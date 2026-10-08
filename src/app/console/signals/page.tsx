"use client";

import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { computeSignals } from "@/lib/signals";
import { EmptyState, PageHead, SkeletonRows } from "@/components/ui";

/** Deterministic, rule-based checks over current contract state. */
export default function SignalsPage() {
  const { snapshot, loading, now, wallet } = useCourt();

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Risk signals" hint="Rule-based checks over contract state — nothing estimated, nothing mocked." />
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const signals = computeSignals(snapshot!, wallet.account, now);
  const sevMeta = {
    action: { label: "Action", cls: "bg-amber", chip: "border-amber/60 text-[#9c6517] bg-[#fdf2e2]" },
    warn: { label: "Heads-up", cls: "bg-clay", chip: "border-clay/50 text-clay bg-[#f9e9e4]" },
    info: { label: "Info", cls: "bg-mint", chip: "border-pine/50 text-pine bg-mist" },
  } as const;

  return (
    <div className="rise-in">
      <PageHead
        title="Risk signals"
        hint="Every signal below is a rule that fired against live court state. If a claim cannot be derived from a spend, a bond or a ruling, it never appears here."
      />
      {signals.length === 0 ? (
        <EmptyState
          title="No signals firing"
          body="The rules watch for lapsed windows, unconvened panels, live appeals and vanished evidence. Right now the docket is clean."
        />
      ) : (
        <div className="border hairline bg-paper divide-y divide-[#0b121017]">
          {signals.map((s) => (
            <Link key={s.id} href={s.href ?? "/console/signals"} className="row-line flex items-start gap-4 px-5 py-4">
              <span className={`w-2.5 h-2.5 mt-1.5 shrink-0 ${sevMeta[s.severity].cls}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <span className="font-extrabold text-sm">{s.title}</span>
                  <span className={`verdict-badge ${sevMeta[s.severity].chip}`}>{sevMeta[s.severity].label}</span>
                </div>
                <p className="text-sm text-fog font-medium">{s.detail}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-ash shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
      <div className="mt-8 card px-5 py-4 flex items-start gap-3">
        <Radar className="w-5 h-5 text-pine shrink-0 mt-0.5" />
        <p className="text-sm text-fog font-medium">
          Signals are recomputed on every poll directly from the snapshot. They never infer intent and never carry
          a confidence score — a rule either fired against on-chain facts or it did not.
        </p>
      </div>
    </div>
  );
}
