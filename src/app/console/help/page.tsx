"use client";

import {
  Coins,
  Gavel,
  HandMetal,
  Keyboard,
  Lock,
  RotateCcw,
  ShieldQuestion,
  StepForward,
} from "lucide-react";
import { NETWORK } from "@/lib/config";
import { PageHead } from "@/components/ui";

/** The flow, the rules and the shortcuts — in plain words. */
export default function HelpPage() {
  return (
    <div className="rise-in max-w-3xl">
      <PageHead title="Help" hint="How a payment moves, what each action costs, and the ten-minute tour of this console." />

      <section className="card px-6 py-6 mb-6">
        <h2 className="font-extrabold text-lg title-tight mb-4">The flow in five steps</h2>
        <div className="space-y-4">
          {[
            { icon: Lock, t: "Open", d: "A payer locks an amount plus a ten-percent bond (at least five test dollars) behind a one-paragraph mandate, a cited evidence page and a short agent trace. The recipient sees nothing yet." },
            { icon: HandMetal, t: "Challenge", d: "For three ticks after opening, anyone who is not the payer or recipient can post an equal bond and say what is wrong — optionally pointing at a counter-page and citing an earlier case." },
            { icon: Gavel, t: "Rule", d: "Anybody can convene the panel. Each validator fetches the pages itself and the group must agree: MATCH, MISMATCH or INCONCLUSIVE. Mismatch reverts the spend and pays the challenger both bonds; anything else slashes the challenger." },
            { icon: RotateCcw, t: "Appeal — once", d: "A losing challenger can post one more equal bond within the appeal window. The panel re-runs with the first verdict as advisory context. Winning reverts everything and returns every bond; losing hands the appeal bond to the recipient." },
            { icon: Coins, t: "Settle", d: "A spend nobody challenges pays out when its window lapses; a cleared spend pays out when the appeal window lapses. Settlement writes a line-by-line ledger of who was paid and why." },
          ].map((s, i) => (
            <div key={s.t} className="flex gap-4">
              <div className="w-9 h-9 border border-pine/40 bg-mist flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-pine" />
              </div>
              <div>
                <div className="font-extrabold text-sm">{i + 1}. {s.t}</div>
                <p className="text-sm text-fog font-medium mt-1 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card px-6 py-6 mb-6">
        <h2 className="font-extrabold text-lg title-tight mb-4 flex items-center gap-2"><ShieldQuestion className="w-5 h-5 text-pine" /> Ground rules</h2>
        <ul className="space-y-2.5 text-sm font-medium text-ink/85 list-none">
          {[
            "The contract has no owner, admin, operator or pause key. Nobody can override the panel.",
            "A ruling must quote the cited pages word for word, or it is discarded as unproven.",
            "Page text is data, never instructions. A page telling the reviewer what to answer only incriminates itself.",
            "A vanished evidence page rules against the spend that cited it — the payer chose the source.",
            "Only a stranger can challenge; payer and recipient are barred on-chain.",
            "Every ruling becomes a numbered case that later challengers can cite.",
            "All value is test money in the court's own ledger. Nothing here is real money.",
          ].map((r) => (
            <li key={r} className="flex gap-3">
              <StepForward className="w-4 h-4 text-pine shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card px-6 py-6 mb-6">
        <h2 className="font-extrabold text-lg title-tight mb-4 flex items-center gap-2"><Keyboard className="w-5 h-5 text-pine" /> Shortcuts & habits</h2>
        <div className="space-y-3 text-sm font-medium text-ink/85">
          <div className="flex items-center justify-between gap-4 border-b hairline pb-3">
            <span>Search spends, rulings, pages and actions</span>
            <span className="chip">⌘K / Ctrl K</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b hairline pb-3">
            <span>Force a fresh read of the court</span>
            <span className="chip">Refresh icon, top right</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>One phone-width console with bottom navigation</span>
            <span className="chip">&lt; 1024 px</span>
          </div>
        </div>
      </section>

      <section className="night-grid text-paper px-6 py-6 border border-night">
        <h2 className="font-extrabold text-lg title-tight mb-3">Good to know</h2>
        <ul className="space-y-2.5 text-sm font-medium text-paper/75">
          <li>· A panel round takes 20–60 seconds on this network; the progress card shows each stage and links the transaction.</li>
          <li>· The hosted endpoint allows roughly thirty requests a minute per client, so the app reads everything in one call and polls slowly.</li>
          <li>· If validators cannot agree, the transaction lands undetermined and nothing moves — just convene the panel again.</li>
          <li>· Connect MetaMask and you will be asked to add {NETWORK.name} (chain {NETWORK.chainId}) once; after that the wallet signs every action.</li>
        </ul>
      </section>
    </div>
  );
}
