"use client";

import { CheckCircle2 } from "lucide-react";
import { useCourt } from "@/lib/store";
import { Spinner, TxLink } from "./ui";

/** Bottom-right progress card while a wallet transaction is in consensus. */
export function TxStageOverlay() {
  const { stage } = useCourt();
  if (!stage) return null;
  const steps = [
    { key: "signing", label: "Signing in wallet" },
    { key: "submitted", label: "Submitted to Studionet" },
    { key: "accepted", label: "Accepted by consensus" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === stage.stage);
  return (
    <div className="fixed bottom-5 right-5 z-[70] w-80 card shadow-lift rise-in">
      <div className="px-4 py-3 border-b hairline font-extrabold text-sm title-tight">{stage.label}</div>
      <div className="px-4 py-3 space-y-2.5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2.5 text-sm font-semibold">
            {i < activeIdx ? (
              <CheckCircle2 className="w-4 h-4 text-pine" />
            ) : i === activeIdx ? (
              <Spinner className="text-pine" />
            ) : (
              <span className="w-4 h-4 border hairline inline-block" />
            )}
            <span className={i > activeIdx ? "text-ash" : "text-ink"}>{s.label}</span>
          </div>
        ))}
        {stage.hash && (
          <div className="pt-2 border-t hairline">
            <TxLink hash={stage.hash} />
          </div>
        )}
        <p className="text-[11px] text-fog font-medium">
          A panel round takes 20–60 seconds on this network — the page refreshes itself when it lands.
        </p>
      </div>
    </div>
  );
}
