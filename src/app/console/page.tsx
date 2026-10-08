"use client";

import { ArrowRight, Crosshair, Gavel, Landmark, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import { computeOpportunities, computeSignals } from "@/lib/signals";
import { countdown } from "@/lib/format";
import { CardLink, EmptyState, PageHead, SkeletonRows, Stat, StatusBadge, VerdictBadge } from "@/components/ui";

export default function OverviewPage() {
  const { snapshot, loading, now, wallet } = useCourt();

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Overview" hint="How much is under watch, what is at risk, and what to do next." />
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const snap = snapshot!;
  const me = wallet.account?.toLowerCase() ?? null;
  const watch = snap.spends.filter((s) => s.status === "open" || s.status === "challenged" || s.status === "cleared");
  const locked = watch.reduce((a, s) => a + s.amount + s.bond + (s.challenge?.bond ?? 0) + (s.challenge?.appeal_bond ?? 0), 0);
  const balance = me ? snap.accounts[me]?.balance ?? null : null;
  const opportunities = computeOpportunities(snap, me, now).slice(0, 6);
  const signals = computeSignals(snap, me, now);
  const recentRulings = snap.cases.slice(0, 4);

  return (
    <div className="rise-in">
      <PageHead
        title="Overview"
        hint="How much is under watch, what is at risk, and what to do next — every number straight from the court."
        right={
          !wallet.account ? (
            <button type="button" onClick={() => wallet.connect().catch(() => {})} className="btn btn-ink text-xs">
              Connect wallet to participate
            </button>
          ) : undefined
        }
      />

      {/* stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Under watch" value={watch.length} sub="spends not yet settled" />
        <Stat label="Locked value" value={fmtMoney(locked)} sub="amounts + all bonds" />
        <Stat label="Panel rulings" value={snap.stats.case_count} sub={snap.stats.case_count > 0 ? "each citeable as precedent" : "none yet — convene the first panel"} />
        <Stat label="Your ledger" value={balance !== null ? fmtMoney(balance) : "—"} sub={me ? "test funds in the court" : "connect a wallet"} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* spends under watch */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-xl title-tight flex items-center gap-2">
              <Landmark className="w-5 h-5 text-pine" /> Under watch
            </h2>
            <Link href="/console/spends" className="text-xs font-extrabold text-pine hover:underline underline-offset-2 inline-flex items-center gap-1">
              All spends <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {watch.length === 0 ? (
            <EmptyState
              title="Nothing under watch"
              body="No live spends. Open one against a live public page and the docket lights up here."
              action={<Link href="/console/spends?new=1" className="btn btn-mint text-xs">Open the first spend</Link>}
            />
          ) : (
            <div className="space-y-3">
              {watch.slice(0, 5).map((s) => (
                <CardLink key={s.id} href={`/console/spends/${s.id}`} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="label-micro text-fog">Spend #{s.id}</span>
                        <StatusBadge status={s.status} />
                        {s.challenge?.verdict_label && <VerdictBadge label={s.challenge.verdict_label} />}
                      </div>
                      <p className="text-sm font-semibold leading-snug line-clamp-1">{s.mandate}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold">{fmtMoney(s.amount)}</div>
                      <div className="text-xs text-fog font-semibold mt-0.5">
                        {s.status === "open"
                          ? countdown(s.challenge_deadline, now)
                          : s.status === "cleared"
                            ? `appeal ${countdown(s.appeal_deadline, now)}`
                            : `bond ${fmtMoney(s.bond)}`}
                      </div>
                    </div>
                  </div>
                </CardLink>
              ))}
            </div>
          )}

          {/* recent rulings */}
          <h2 className="font-extrabold text-xl title-tight flex items-center gap-2 mt-10 mb-4">
            <Gavel className="w-5 h-5 text-pine" /> Latest rulings
          </h2>
          {recentRulings.length === 0 ? (
            <div className="card px-5 py-6 text-sm text-fog font-medium">
              No rulings yet. The first challenged spend that reaches the panel writes case #1.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRulings.map((c) => (
                <CardLink key={c.id} href="/console/analysis" className="px-5 py-4 flex items-start gap-4">
                  <VerdictBadge label={c.label} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="label-micro text-fog">Case #{c.id}</span>
                      {c.overturned && <span className="verdict-badge border-clay/50 text-clay bg-[#f9e9e4]">Overturned</span>}
                    </div>
                    <p className="text-sm font-medium text-ink/80 leading-snug line-clamp-2">{c.reason}</p>
                  </div>
                  <span className="label-micro text-ash shrink-0">R{c.round}</span>
                </CardLink>
              ))}
            </div>
          )}
        </div>

        {/* radar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-xl title-tight flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-pine" /> Opportunity radar
            </h2>
          </div>
          <div className="card bg-mist/40">
            {opportunities.length === 0 ? (
              <div className="px-5 py-8 text-sm text-fog font-medium">
                The radar is quiet — no spend needs an action right now.
              </div>
            ) : (
              opportunities.map((o) => (
                <Link
                  key={`${o.kind}-${o.spend.id}`}
                  href={`/console/spends/${o.spend.id}`}
                  className="row-line block px-5 py-4 border-b hairline last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold">Spend #{o.spend.id}</span>
                    <span className={`verdict-badge ${o.kind === "contest" ? "border-pine/50 text-pine bg-mist" : "border-amber/60 text-[#9c6517] bg-[#fdf2e2]"}`}>
                      {o.kind === "finalize" ? "Finalize" : o.kind === "convene" ? "Convene" : o.kind === "appeal" ? "Appeal" : "Contest"}
                    </span>
                  </div>
                  <div className="text-xs text-fog font-semibold">{o.headline} — {o.note}</div>
                  <div className="text-xs text-pine font-bold mt-1.5">{fmtMoney(o.spend.amount)} at stake</div>
                </Link>
              ))
            )}
          </div>

          <div className="mt-6">
            <h3 className="font-extrabold text-sm title-tight flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-pine" /> Risk signals
            </h3>
            {signals.length === 0 ? (
              <div className="text-xs text-fog font-medium card px-4 py-4">No rule over the current state fires.</div>
            ) : (
              <div className="space-y-2">
                {signals.slice(0, 4).map((s) => (
                  <Link key={s.id} href={s.href ?? "/console/signals"} className="card row-line block px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 shrink-0 ${s.severity === "action" ? "bg-amber" : s.severity === "warn" ? "bg-clay" : "bg-mint"}`} />
                      <span className="text-xs font-extrabold truncate">{s.title}</span>
                    </div>
                  </Link>
                ))}
                {signals.length > 4 && (
                  <Link href="/console/signals" className="block text-xs font-extrabold text-pine hover:underline underline-offset-2 px-1 pt-1">
                    +{signals.length - 4} more signals
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
