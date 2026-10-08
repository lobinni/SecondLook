"use client";

import { ChevronDown, Fingerprint, Unplug, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCourt } from "@/lib/store";
import { NETWORK } from "@/lib/config";
import { fmtMoney } from "@/lib/money";
import { shortAddr } from "@/lib/format";
import { AddrChip, LiveDot } from "./ui";

/**
 * The participation gate. Reads work for everyone; every write goes through
 * the connected wallet on the configured network (chain 61999 by default).
 */
export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { wallet, snapshot } = useCourt();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const balance =
    wallet.account && snapshot?.accounts?.[wallet.account.toLowerCase()]
      ? snapshot.accounts[wallet.account.toLowerCase()].balance
      : null;

  const onConnect = async () => {
    setError(null);
    try {
      await wallet.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!wallet.available) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost text-xs"
        title="This app needs a browser wallet to participate"
      >
        <Wallet className="w-4 h-4" /> Install MetaMask
      </a>
    );
  }

  if (!wallet.account) {
    return (
      <div className="relative">
        <button type="button" onClick={onConnect} disabled={wallet.connecting} className="btn btn-ink text-xs">
          <Fingerprint className="w-4 h-4" />
          {wallet.connecting ? "Connecting…" : "Connect wallet"}
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-2 w-72 card p-3 text-xs text-clay font-semibold shadow-lift z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (!wallet.chainOk) {
    return (
      <button type="button" onClick={() => wallet.switchNetwork()} className="btn btn-danger text-xs">
        <Unplug className="w-4 h-4" /> Switch to {NETWORK.shortName}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost text-xs !py-2.5"
        aria-expanded={open}
      >
        <LiveDot />
        <span className="font-extrabold">{shortAddr(wallet.account)}</span>
        {!compact && balance !== null && (
          <span className="text-fog font-semibold border-l hairline pl-2">{fmtMoney(balance)}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-fog" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-lift z-50 rise-in">
          <div className="px-4 py-3 border-b hairline">
            <div className="label-micro text-fog mb-1.5">Connected on {NETWORK.name}</div>
            <AddrChip addr={wallet.account} />
          </div>
          <div className="px-4 py-3 border-b hairline flex items-center justify-between">
            <span className="text-xs font-bold text-fog uppercase tracking-wider">Ledger balance</span>
            <span className="font-extrabold">{balance !== null ? fmtMoney(balance) : "—"}</span>
          </div>
          <div className="px-4 py-3 flex gap-2">
            <a href="/console/settings" className="btn btn-ghost text-xs flex-1">Wallet settings</a>
            <button type="button" onClick={() => { wallet.forget(); setOpen(false); }} className="btn btn-ghost text-xs">
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
