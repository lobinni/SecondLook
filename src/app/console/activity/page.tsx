"use client";

import { Activity } from "lucide-react";
import { useCourt } from "@/lib/store";
import { fmtClock } from "@/lib/format";
import { EmptyState, PageHead, TxLink } from "@/components/ui";

/** Everything this browser session has signed, newest first. */
export default function ActivityPage() {
  const { activity, wallet } = useCourt();

  return (
    <div className="rise-in max-w-3xl">
      <PageHead
        title="Activity"
        hint="Session history of what your wallet sent — kept in this browser tab only, never uploaded anywhere."
      />
      {activity.length === 0 ? (
        <EmptyState
          title="A quiet session"
          body="Claims, challenges, panel rounds and settlements you trigger appear here with their transaction links."
          action={
            !wallet.account ? (
              <button type="button" onClick={() => wallet.connect().catch(() => {})} className="btn btn-ink text-xs">Connect wallet</button>
            ) : undefined
          }
        />
      ) : (
        <div className="border hairline bg-paper divide-y divide-[#0b121017]">
          {activity.map((a) => (
            <div key={a.id} className="px-5 py-4 flex items-center gap-4">
              <div className={`w-8 h-8 border flex items-center justify-center shrink-0 ${a.status === "ok" ? "border-pine/40 bg-mist" : a.status === "error" ? "border-clay/40 bg-[#f9e9e4]" : "border-amber/50 bg-[#fdf2e2]"}`}>
                <Activity className={`w-4 h-4 ${a.status === "ok" ? "text-pine" : a.status === "error" ? "text-clay" : "text-[#9c6517]"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold truncate">{a.label}</div>
                {a.detail && <div className="text-xs text-clay font-semibold truncate">{a.detail}</div>}
                <div className="text-xs text-fog font-semibold mt-0.5">{fmtClock(a.at)}</div>
              </div>
              {a.hash && <TxLink hash={a.hash} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
