"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileSearch,
  Flag,
  Gavel,
  Landmark,
  Quote,
  Receipt,
  RotateCcw,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCourt } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import { countdown, fmtClock, hostOf, shortAddr, timeAgo } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/config";
import { SpendActions } from "@/components/Actions";
import { AddrChip, EmptyState, SkeletonRows, StatusBadge, VerdictBadge } from "@/components/ui";

export default function SpendDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { snapshot, loading, now, wallet, updatedAt } = useCourt();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(true);

  const spend = snapshot?.spends.find((s) => s.id === id);

  if (loading && !snapshot) {
    return <SkeletonRows rows={5} />;
  }
  if (snapshot && !spend) {
    return (
      <EmptyState
        title={`No spend #${id} on this court`}
        body="It may belong to a different deployment, or the snapshot window (newest 50) has scrolled past it."
        action={<Link href="/console/spends" className="btn btn-ghost text-xs">Back to spends</Link>}
      />
    );
  }
  if (!spend) return null;

  const ch = spend.challenge;
  const me = wallet.account?.toLowerCase() ?? null;
  const relatedCase = ch && ch.case_id > 0 ? snapshot?.cases.find((c) => c.id === ch.case_id) : null;

  // Timeline derived purely from state
  const timeline = [
    { label: "Opened", when: spend.opened_at, icon: Landmark, note: `${fmtMoney(spend.amount + spend.bond)} locked by the payer` },
    ch && { label: "Challenge filed", when: null, icon: Flag, note: `counter-bond ${fmtMoney(ch.bond)} posted by a stranger` },
    ch && ch.case_id > 0 && { label: "Panel ruled", when: null, icon: Gavel, note: `${ch.verdict_label} — case #${ch.case_id}` },
    ch && ch.appeals > 0 && { label: "Appeal posted", when: null, icon: RotateCcw, note: `second bond ${fmtMoney(ch.appeal_bond)} locked` },
    (spend.status === "final" || spend.status === "reverted") && { label: spend.status === "final" ? "Settled" : "Reverted", when: null, icon: Receipt, note: `${spend.settlement.length} ledger entries written` },
  ].filter(Boolean) as { label: string; when: number | null; icon: typeof Flag; note: string }[];

  return (
    <div className="rise-in">
      <Link href="/console/spends" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fog hover:text-ink mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> All spends
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <h1 className="text-3xl font-extrabold title-tight">Spend #{spend.id}</h1>
            <StatusBadge status={spend.status} />
            {ch?.verdict_label && <VerdictBadge label={ch.verdict_label} />}
            {relatedCase?.overturned && <span className="verdict-badge border-clay/50 text-clay bg-[#f9e9e4]">Ruling overturned</span>}
          </div>
          <p className="text-fog text-sm font-medium max-w-3xl leading-relaxed">{spend.mandate}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold title-tight">{fmtMoney(spend.amount)}</div>
          <div className="text-xs text-fog font-semibold mt-1">+ {fmtMoney(spend.bond)} payer bond</div>
        </div>
      </div>

      {/* clocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ClockTile label="Challenge window" target={spend.status === "open" ? spend.challenge_deadline : null} now={now} fallback={spend.status === "open" ? "" : "closed"} />
        <ClockTile label="Appeal window" target={spend.status === "cleared" ? spend.appeal_deadline : null} now={now} fallback={spend.status === "cleared" ? "" : "—"} />
        <div className="card px-4 py-3">
          <div className="label-micro text-fog mb-1">Opened</div>
          <div className="font-extrabold text-sm">{fmtClock(spend.opened_at)}</div>
          <div className="text-xs text-fog font-semibold mt-0.5">{timeAgo(spend.opened_at, now)}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="label-micro text-fog mb-1">Synced</div>
          <div className="font-extrabold text-sm">{updatedAt ? `${now - updatedAt}s ago` : "—"}</div>
          <div className="text-xs text-fog font-semibold mt-0.5">one multi-read per poll</div>
        </div>
      </div>

      {actionError && (
        <div className="border border-clay/40 bg-[#f9e9e4] px-4 py-3 text-sm font-semibold text-clay mb-6 rise-in">
          {actionError}
        </div>
      )}

      <div className="card px-5 py-4 mb-6 shadow-edge">
        <div className="label-micro text-pine mb-3">Actions — signed by your wallet</div>
        <SpendActions spend={spend} onError={setActionError} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* parties */}
          <section className="card px-5 py-5">
            <h2 className="label-micro text-fog mb-4">Parties</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Party label="Payer" addr={spend.payer} you={me === spend.payer.toLowerCase()} />
              <Party label="Recipient" addr={spend.recipient} you={me === spend.recipient.toLowerCase()} />
              {ch ? <Party label="Challenger" addr={ch.challenger} you={me === ch.challenger.toLowerCase()} /> : (
                <div>
                  <div className="text-xs font-bold text-fog uppercase tracking-wider mb-1.5">Challenger</div>
                  <div className="text-sm font-semibold text-ash">Nobody yet — the seat is always open</div>
                </div>
              )}
            </div>
          </section>

          {/* evidence */}
          <section className="card px-5 py-5">
            <button type="button" className="w-full flex items-center justify-between" onClick={() => setShowEvidence((v) => !v)}>
              <h2 className="label-micro text-fog flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-pine" /> Evidence the panel reads
              </h2>
              <span className="text-xs font-extrabold text-pine">{showEvidence ? "Collapse" : "Expand"}</span>
            </button>
            {showEvidence && (
              <div className="mt-4 space-y-4 rise-in">
                <EvidenceRow kind="Cited by the payer" url={spend.evidence_url} />
                {ch?.counter_url && <EvidenceRow kind="Counter-page from the challenger" url={ch.counter_url} />}
                <div className="border hairline bg-mist/40 px-4 py-3">
                  <div className="label-micro text-fog mb-1.5">Agent trace</div>
                  <p className="text-sm font-medium text-ink/85">{spend.trace}</p>
                </div>
                {ch && (
                  <div className="border hairline bg-mist/40 px-4 py-3">
                    <div className="label-micro text-fog mb-1.5">Challenger's claim</div>
                    <p className="text-sm font-medium text-ink/85">{ch.claim}</p>
                  </div>
                )}
                <p className="text-xs text-fog font-medium">
                  Validators fetch these pages themselves at ruling time. Text on a page is data, never instructions —
                  pages that beg the panel for a verdict only incriminate themselves.
                </p>
              </div>
            )}
          </section>

          {/* settlement ledger */}
          {spend.settlement.length > 0 && (
            <section className="card px-5 py-5">
              <h2 className="label-micro text-fog mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-pine" /> Settlement ledger</h2>
              <div className="divide-y divide-[#0b121017] border hairline">
                {spend.settlement.map((f, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{f.why}</div>
                      <AddrChip addr={f.to} />
                    </div>
                    <div className="font-extrabold text-pine shrink-0">{fmtMoney(f.amount)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* timeline */}
          <section className="card px-5 py-5">
            <h2 className="label-micro text-fog mb-4 flex items-center gap-2"><Timer className="w-4 h-4 text-pine" /> Timeline</h2>
            <div className="space-y-0">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 border border-pine/40 bg-mist flex items-center justify-center shrink-0">
                      <t.icon className="w-3.5 h-3.5 text-pine" />
                    </div>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-ink/10" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-sm font-extrabold">{t.label}</div>
                    <div className="text-xs text-fog font-semibold">{t.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* panel analysis */}
          {ch && ch.case_id > 0 && (
            <section className="night-grid text-paper px-5 py-5 border border-night">
              <h2 className="label-micro text-mint mb-4 flex items-center gap-2"><Gavel className="w-4 h-4" /> Panel analysis</h2>
              <div className="flex items-center gap-2.5 mb-3">
                <VerdictBadge label={ch.verdict_label} />
                <span className="text-xs font-extrabold text-paper/50">case #{ch.case_id}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-paper/85">{ch.verdict_reason}</p>
              {ch.evidence_quote && (
                <div className="mt-4 border hairline-night bg-[#0a1a15] px-4 py-3">
                  <div className="flex items-center gap-2 label-micro text-mint/70 mb-2"><Quote className="w-3.5 h-3.5" /> Verified on the pages</div>
                  <p className="text-sm font-medium italic text-paper/80 leading-relaxed">“{ch.evidence_quote}”</p>
                </div>
              )}
              {ch.cited_case_id > 0 && (
                <div className="mt-3 text-xs font-semibold text-paper/50">Cited precedent: case #{ch.cited_case_id}</div>
              )}
              <Link href="/console/analysis" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-mint mt-4 hover:underline underline-offset-2">
                All rulings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Party({ label, addr, you }: { label: string; addr: string; you: boolean }) {
  return (
    <div>
      <div className="text-xs font-bold text-fog uppercase tracking-wider mb-1.5">{label}{you && <span className="ml-2 text-pine">— you</span>}</div>
      <a href={explorerAddressUrl(addr)} target="_blank" rel="noreferrer" className="mute-id hover:text-pine" title={addr}>
        {shortAddr(addr, 10, 8)}
      </a>
    </div>
  );
}

function ClockTile({ label, target, now, fallback }: { label: string; target: number | null; now: number; fallback: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="label-micro text-fog mb-1">{label}</div>
      {target ? (
        <>
          <div className={`font-extrabold text-sm ${target - now < 45 ? "text-clay" : ""}`}>{countdown(target, now)}</div>
          <div className="text-xs text-fog font-semibold mt-0.5">{fmtClock(target)}</div>
        </>
      ) : (
        <div className="font-extrabold text-sm text-ash">{fallback}</div>
      )}
    </div>
  );
}

function EvidenceRow({ kind, url }: { kind: string; url: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border hairline px-4 py-3">
      <div className="min-w-0">
        <div className="label-micro text-fog mb-1">{kind}</div>
        <div className="text-sm font-bold truncate">{hostOf(url)}</div>
        <div className="mute-id truncate">{url}</div>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs shrink-0">Open page</a>
    </div>
  );
}
