"use client";

import { CheckCheck, Gavel, HandMetal, RotateCcw, Scale, Send } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCourt } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import type { Spend } from "@/lib/types";
import { Spinner } from "./ui";

/**
 * Every action a spend allows, derived purely from its status, deadlines and
 * the connected wallet. Buttons never appear for states the contract would
 * reject — the contract still refuses anything else.
 */
export function SpendActions({ spend, onError }: { spend: Spend; onError: (msg: string | null) => void }) {
  const { wallet, act, now, snapshot, busy } = useCourt();
  const [claim, setClaim] = useState("");
  const [counterUrl, setCounterUrl] = useState("");
  const [precedent, setPrecedent] = useState("0");
  const [showChallenge, setShowChallenge] = useState(false);

  useEffect(() => {
    onError(null);
  }, [spend.id, onError]);

  const me = wallet.account?.toLowerCase() ?? null;
  const ch = spend.challenge;
  const isParty = !!me && (spend.payer.toLowerCase() === me || spend.recipient.toLowerCase() === me);
  const isChallenger = !!me && ch?.challenger.toLowerCase() === me;

  const challengesList = snapshot?.cases ?? [];
  const citeOptions = useMemo(
    () => challengesList.filter((c) => c.spend_id !== spend.id).slice(0, 12),
    [challengesList, spend.id],
  );

  if (!wallet.account || !wallet.chainOk) {
    return (
      <Gate note={
        !wallet.account
          ? "Connect your wallet (MetaMask on Studionet, chain 61999) to challenge, convene the panel, or settle this spend."
          : "Switch to Studionet (chain 61999) to act on this spend."
      } />
    );
  }

  const run = async (label: string, fn: string, args: (string | number | bigint)[]) => {
    onError(null);
    try {
      await act(label, fn, args);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const buttons: ReactNode[] = [];

  if (spend.status === "open" && now < spend.challenge_deadline && !isParty) {
    buttons.push(
      <button key="challenge" type="button" className="btn btn-mint text-xs" onClick={() => setShowChallenge((v) => !v)}>
        <HandMetal className="w-4 h-4" /> Challenge this spend
      </button>,
    );
  }
  if (spend.status === "open" && now < spend.challenge_deadline && isParty) {
    buttons.push(<span key="party-note" className="text-xs font-semibold text-fog">You are a party to this spend — only a stranger can challenge it.</span>);
  }
  if (spend.status === "open" && now >= spend.challenge_deadline) {
    buttons.push(
      <button key="finalize" type="button" disabled={busy !== null} className="btn btn-mint text-xs"
        onClick={() => run("Finalize spend", "finalize", [BigInt(spend.id)])}>
        {busy === "Finalize spend" ? <Spinner /> : <CheckCheck className="w-4 h-4" />} Finalize payout
      </button>,
    );
  }
  if (spend.status === "challenged" && ch?.status === "pending") {
    buttons.push(
      <button key="rule" type="button" disabled={busy !== null} className="btn btn-ink text-xs"
        onClick={() => run("Convene the panel", "rule", [BigInt(ch.id)])}>
        {busy === "Convene the panel" ? <Spinner /> : <Gavel className="w-4 h-4" />} Convene the panel
      </button>,
    );
  }
  if (spend.status === "challenged" && ch?.status === "appealed") {
    buttons.push(
      <button key="rule-appeal" type="button" disabled={busy !== null} className="btn btn-ink text-xs"
        onClick={() => run("Run the appeal round", "rule_appeal", [BigInt(ch.id)])}>
        {busy === "Run the appeal round" ? <Spinner /> : <Scale className="w-4 h-4" />} Rule the appeal
      </button>,
    );
  }
  if (spend.status === "cleared" && ch?.status === "rejected" && isChallenger && now < spend.appeal_deadline && ch.appeals === 0) {
    buttons.push(
      <button key="appeal" type="button" disabled={busy !== null} className="btn btn-mint text-xs"
        onClick={() => run("Appeal the ruling", "appeal", [BigInt(ch.id)])}>
        {busy === "Appeal the ruling" ? <Spinner /> : <RotateCcw className="w-4 h-4" />} Appeal ({fmtMoney(ch.bond)} bond)
      </button>,
      <button key="accept" type="button" disabled={busy !== null} className="btn btn-ghost text-xs"
        onClick={() => run("Accept the ruling", "accept_ruling", [BigInt(ch.id)])}>
        {busy === "Accept the ruling" ? <Spinner /> : <CheckCheck className="w-4 h-4" />} Accept ruling
      </button>,
    );
  }
  if (spend.status === "cleared" && now >= spend.appeal_deadline) {
    buttons.push(
      <button key="settle" type="button" disabled={busy !== null} className="btn btn-mint text-xs"
        onClick={() => run("Settle the payout", "finalize", [BigInt(spend.id)])}>
        {busy === "Settle the payout" ? <Spinner /> : <Send className="w-4 h-4" />} Settle the payout
      </button>,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5">{buttons.length > 0 ? buttons : <span className="text-xs text-fog font-semibold">No action is available in the current state.</span>}</div>

      {showChallenge && spend.status === "open" && (
        <div className="border hairline bg-mist/50 px-5 py-4 space-y-4 rise-in">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-extrabold title-tight">Fund a second look</h4>
            <span className="chip !normal-case">Bond required: {fmtMoney(spend.bond)}</span>
          </div>
          <label className="block">
            <span className="label-micro text-fog block mb-1.5">Your claim (what is wrong with this spend?)</span>
            <textarea className="input" value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="The cited page does not support this mandate because…" />
            <span className="text-xs text-fog mt-1 block font-medium">{claim.trim().length}/600 characters, at least 10</span>
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="label-micro text-fog block mb-1.5">Counter-page URL (optional)</span>
              <input className="input" value={counterUrl} onChange={(e) => setCounterUrl(e.target.value)} placeholder="https://…" spellCheck={false} />
            </label>
            <label className="block">
              <span className="label-micro text-fog block mb-1.5">Cite a prior case (optional)</span>
              <select className="input" value={precedent} onChange={(e) => setPrecedent(e.target.value)}>
                <option value="0">None</option>
                {citeOptions.map((c) => (
                  <option key={c.id} value={c.id}>Case #{c.id} · {c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="btn btn-mint text-xs"
              disabled={claim.trim().length < 10 || busy !== null}
              onClick={() =>
                run("Challenge the spend", "challenge", [
                  BigInt(spend.id),
                  claim.trim().replace(/\s+/g, " "),
                  counterUrl.trim(),
                  BigInt(Number(precedent) || 0),
                ])
              }
            >
              {busy === "Challenge the spend" ? <Spinner /> : <HandMetal className="w-4 h-4" />} Post {fmtMoney(spend.bond)} bond
            </button>
            <button type="button" className="btn btn-ghost text-xs" onClick={() => setShowChallenge(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Gate({ note }: { note: string }) {
  const { wallet } = useCourt();
  return (
    <div className="border hairline bg-mist/50 px-5 py-4 flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-fog flex-1 min-w-56">{note}</span>
      {!wallet.account ? (
        <button type="button" onClick={() => wallet.connect().catch(() => {})} className="btn btn-ink text-xs">Connect wallet</button>
      ) : !wallet.chainOk ? (
        <button type="button" onClick={() => wallet.switchNetwork()} className="btn btn-danger text-xs">Switch network</button>
      ) : null}
    </div>
  );
}
