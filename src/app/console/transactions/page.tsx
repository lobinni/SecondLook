"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import { fmtClock, shortAddr } from "@/lib/format";
import { EmptyState, PageHead, SkeletonRows, StatusBadge, TxLink } from "@/components/ui";

/** Every payout the court has written, plus this session's wallet transactions. */
export default function TransactionsPage() {
  const { snapshot, loading, activity } = useCourt();

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Transactions" hint="Every payout and why." />
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const settled = snapshot!.spends.filter((s) => s.settlement.length > 0);

  return (
    <div className="rise-in space-y-10">
      <div>
        <PageHead
          title="Transactions"
          hint="Court-settled payouts with their full ledger, followed by everything your wallet did this session."
        />
        {settled.length === 0 ? (
          <EmptyState
            title="No payout has settled yet"
            body="When a spend finalizes or reverts, the court writes a line-by-line ledger of exactly who was paid and why."
          />
        ) : (
          <div className="space-y-4">
            {settled.map((s) => (
              <div key={s.id} className="card px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-pine" />
                    <Link href={`/console/spends/${s.id}`} className="font-extrabold hover:text-pine">Spend #{s.id}</Link>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-sm font-extrabold">{fmtMoney(s.amount)} principal</div>
                </div>
                <div className="divide-y divide-[#0b121017] border hairline">
                  {s.settlement.map((f, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold text-ink/80 truncate">{f.why}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="mute-id">{shortAddr(f.to)}</span>
                        <span className="font-extrabold text-pine w-24 text-right">{fmtMoney(f.amount)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-extrabold text-xl title-tight mb-4">Your session</h2>
        {activity.length === 0 ? (
          <div className="card px-5 py-6 text-sm text-fog font-medium">
            Nothing signed yet this session. Claims, challenges, rulings and payouts you trigger will appear here with their transaction links.
          </div>
        ) : (
          <div className="border hairline bg-paper divide-y divide-[#0b121017]">
            {activity.map((a) => (
              <div key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">{a.label}</div>
                  {a.detail && <div className="text-xs text-clay font-semibold truncate">{a.detail}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-fog font-semibold">{fmtClock(a.at)}</span>
                  <span className={`verdict-badge ${a.status === "ok" ? "border-pine/50 text-pine bg-mist" : a.status === "error" ? "border-clay/50 text-clay bg-[#f9e9e4]" : "border-amber/60 text-[#9c6517] bg-[#fdf2e2]"}`}>
                    {a.status === "ok" ? "Confirmed" : a.status === "error" ? "Failed" : "Pending"}
                  </span>
                  {a.hash && <TxLink hash={a.hash} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
