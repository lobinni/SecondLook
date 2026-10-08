"use client";

import { CircleDollarSign, Plus, ShieldQuestion, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCourt } from "@/lib/store";
import { MICROS } from "@/lib/config";
import { bondFor, fmtMoney, parseAmount, usdUnit } from "@/lib/money";
import { PRESETS } from "@/lib/presets";
import { Spinner } from "./ui";

const ADDR_OK = /^0x[0-9a-fA-F]{40}$/;

/**
 * "Open a new spend" — presets cite live public pages so the panel rules on
 * reality, or write a fully custom mandate.
 */
export function NewSpendModal({ onClose }: { onClose: () => void }) {
  const { wallet, act, snapshot, busy } = useCourt();
  const [tab, setTab] = useState<string>(PRESETS[0].id);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("25");
  const [mandate, setMandate] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [trace, setTrace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const preset = PRESETS.find((p) => p.id === tab);
  const custom = tab === "custom";

  const cfg = snapshot?.config;
  const amountMicros = parseAmount(amount) ?? 0;
  const bond = bondFor(amountMicros, cfg?.bond_bps ?? 1000, cfg?.min_bond ?? 5_000_000);
  const total = amountMicros + bond;

  const myBalance = useMemo(() => {
    if (!wallet.account || !snapshot) return null;
    return snapshot.accounts[wallet.account.toLowerCase()]?.balance ?? 0;
  }, [snapshot, wallet.account]);

  const seeded = useMemo(() => {
    if (!wallet.account || !snapshot) return 0;
    return snapshot.accounts[wallet.account.toLowerCase()]?.seeded_amount ?? 0;
  }, [snapshot, wallet.account]);

  const needSeed = seeded === 0 && (myBalance ?? 0) < total;

  const fill = {
    mandate: custom ? mandate : preset!.mandate,
    evidenceUrl: custom ? evidenceUrl : preset!.evidenceUrl,
    trace: custom ? trace : preset!.trace,
  };

  const valid =
    ADDR_OK.test(recipient) &&
    amountMicros >= (cfg?.min_amount ?? 1_000_000) &&
    fill.mandate.trim().length >= 20 &&
    fill.mandate.trim().length <= 600 &&
    fill.trace.trim().length <= 300 &&
    /^https:\/\//.test(fill.evidenceUrl) &&
    fill.evidenceUrl.length <= 300;

  const submit = async () => {
    setError(null);
    try {
      const hash = await act("Open a new spend", "open_spend", [
        recipient,
        BigInt(amountMicros),
        fill.mandate.trim().replace(/\s+/g, " "),
        fill.evidenceUrl.trim(),
        fill.trace.trim().replace(/\s+/g, " "),
      ]);
      setDone(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const seed = async () => {
    setError(null);
    try {
      await act("Get test funds", "seed", [BigInt(Math.min(cfg?.seed_cap ?? 1_000_000_000, 1_000 * MICROS))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl card shadow-lift rise-in max-h-[92vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 bg-paper z-10">
          <div>
            <div className="label-micro text-pine">New spend</div>
            <h3 className="font-extrabold text-xl title-tight">Lock a payment behind a mandate</h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost !p-2" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-5 w-12 h-12 bg-mint border border-ink shadow-hard-sm flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-lg title-tight">Spend submitted</h4>
            <p className="text-sm text-fog mt-2 font-medium max-w-md mx-auto">
              The payment is locked. For the next challenge window, any stranger can fund a second look.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <a href="/console/spends" className="btn btn-mint text-xs">See open spends</a>
              <button type="button" onClick={onClose} className="btn btn-ghost text-xs">Close</button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* preset tabs */}
            <div>
              <div className="label-micro text-fog mb-2">Scenario</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTab(p.id)}
                    className={`chip transition-colors ${tab === p.id ? "!bg-night !text-mint !border-night" : "hover:border-ink"}`}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTab("custom")}
                  className={`chip transition-colors ${custom ? "!bg-night !text-mint !border-night" : "hover:border-ink"}`}
                >
                  Custom
                </button>
              </div>
              {!custom && <p className="text-xs text-fog mt-2 font-medium">{preset!.blurb}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="label-micro text-fog block mb-1.5">Recipient address</span>
                <input className="input" placeholder="0x…" value={recipient} onChange={(e) => setRecipient(e.target.value)} spellCheck={false} />
                {recipient && !ADDR_OK.test(recipient) && <span className="text-xs text-clay font-semibold mt-1 block">A 20-byte hex address is required</span>}
              </label>
              <label className="block">
                <span className="label-micro text-fog block mb-1.5">Amount ({usdUnit})</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={custom || tab !== "" ? amount : amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00"
                />
                {amount && parseAmount(amount) === null && <span className="text-xs text-clay font-semibold mt-1 block">Numbers with up to 6 decimals</span>}
              </label>
            </div>

            <label className="block">
              <span className="label-micro text-fog block mb-1.5">Mandate (one paragraph, what the payment claims)</span>
              <textarea className="input" value={custom ? mandate : preset!.mandate} onChange={(e) => setMandate(e.target.value)} readOnly={!custom} />
              <span className="text-xs text-fog mt-1 block font-medium">{fill.mandate.length}/600 characters</span>
            </label>

            <label className="block">
              <span className="label-micro text-fog block mb-1.5">Evidence URL (https — the panel fetches it live)</span>
              <input className="input" value={custom ? evidenceUrl : preset!.evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} readOnly={!custom} spellCheck={false} />
            </label>

            <label className="block">
              <span className="label-micro text-fog block mb-1.5">Agent trace (short: what the agent looked at and did)</span>
              <textarea className="input !min-h-[64px]" value={custom ? trace : preset!.trace} onChange={(e) => setTrace(e.target.value)} readOnly={!custom} />
              <span className="text-xs text-fog mt-1 block font-medium">{fill.trace.length}/300 characters</span>
            </label>

            {/* cost preview */}
            <div className="border hairline bg-mist/60 px-5 py-4">
              <div className="label-micro text-pine mb-3 flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> What gets locked</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><div className="text-fog text-xs font-bold uppercase tracking-wider mb-1">Amount</div><div className="font-extrabold">{fmtMoney(amountMicros)}</div></div>
                <div><div className="text-fog text-xs font-bold uppercase tracking-wider mb-1">Bond (10%, min 5)</div><div className="font-extrabold">{fmtMoney(bond)}</div></div>
                <div><div className="text-fog text-xs font-bold uppercase tracking-wider mb-1">Total locked</div><div className="font-extrabold text-pine">{fmtMoney(total)}</div></div>
              </div>
              {wallet.account && myBalance !== null && (
                <div className="mt-3 pt-3 border-t hairline text-xs font-semibold text-fog">
                  Your ledger balance: {fmtMoney(myBalance)}
                  {myBalance < total && !needSeed && <span className="text-clay"> — below the required total</span>}
                </div>
              )}
            </div>

            {error && <div className="border border-clay/40 bg-[#f9e9e4] px-4 py-3 text-sm font-semibold text-clay">{error}</div>}

            <div className="flex flex-wrap items-center gap-3 pb-2">
              {!wallet.account ? (
                <button type="button" onClick={() => wallet.connect().catch(() => {})} className="btn btn-ink text-xs">Connect wallet to open a spend</button>
              ) : !wallet.chainOk ? (
                <button type="button" onClick={() => wallet.switchNetwork()} className="btn btn-danger text-xs">Switch to Studionet (chain 61999)</button>
              ) : needSeed ? (
                <>
                  <button type="button" onClick={seed} disabled={busy !== null} className="btn btn-mint text-xs">
                    {busy === "Get test funds" ? <Spinner /> : null} Get test funds
                  </button>
                  <span className="text-xs text-fog font-semibold flex items-center gap-1.5">
                    <ShieldQuestion className="w-4 h-4" /> One faucet claim per address, then you can lock the spend.
                  </span>
                </>
              ) : (
                <button type="button" onClick={submit} disabled={!valid || busy !== null} className="btn btn-mint text-xs">
                  {busy === "Open a new spend" ? <Spinner /> : <Plus className="w-4 h-4" />} Lock {fmtMoney(total)}
                </button>
              )}
              <button type="button" onClick={onClose} className="btn btn-ghost text-xs">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
