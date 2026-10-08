"use client";

import { CircleDollarSign, Globe, Landmark, Link2, Wallet } from "lucide-react";
import { useState } from "react";
import { useCourt } from "@/lib/store";
import { CONTRACT_ADDRESS, explorerAddressUrl, MICROS, NETWORK } from "@/lib/config";
import { fmtMoney } from "@/lib/money";
import { AddrChip, PageHead, Spinner } from "@/components/ui";
import { WalletButton } from "@/components/WalletButton";

/** Wallet, network and court — the demo cockpit. */
export default function SettingsPage() {
  const { wallet, snapshot, act, busy } = useCourt();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const me = wallet.account?.toLowerCase() ?? null;
  const account = me ? snapshot?.accounts[me] : null;
  const canSeed = !!me && wallet.chainOk && account !== null && account !== undefined && account.seeded_amount === 0;

  const claim = async () => {
    setError(null);
    setDone(false);
    try {
      await act("Get test funds", "seed", [BigInt(Math.min(snapshot?.config.seed_cap ?? 1_000_000_000, 1_000 * MICROS))]);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rise-in max-w-3xl">
      <PageHead title="Settings" hint="Your wallet, the network, and the court this console watches." />

      <section className="card px-6 py-6 mb-6 shadow-edge">
        <h2 className="font-extrabold title-tight flex items-center gap-2 mb-1.5"><Wallet className="w-5 h-5 text-pine" /> Your wallet</h2>
        <p className="text-sm text-fog font-medium mb-5">
          Participation happens from your own address via MetaMask (or any EIP-1193 wallet). This app never sees a key;
          the wallet adds or switches to Studionet (chain {NETWORK.chainId}) and signs every transaction itself.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <WalletButton />
          {me && account && (
            <span className="chip !normal-case">Ledger: <strong className="ml-1">{fmtMoney(account.balance)}</strong></span>
          )}
        </div>
        {me && (
          <div className="mt-5 pt-4 border-t hairline flex flex-wrap items-center gap-3">
            {canSeed ? (
              <button type="button" onClick={claim} disabled={busy !== null} className="btn btn-mint text-xs">
                {busy === "Get test funds" ? <Spinner /> : <CircleDollarSign className="w-4 h-4" />}
                Get test funds
              </button>
            ) : account && account.seeded_amount > 0 ? (
              <span className="text-xs font-semibold text-fog">Faucet already claimed ({fmtMoney(account.seeded_amount)} minted to you).</span>
            ) : (
              <span className="text-xs font-semibold text-fog">The faucet mints each address once.</span>
            )}
            {done && <span className="text-xs font-extrabold text-pine">Funds minted to your ledger.</span>}
            {error && <span className="text-xs font-extrabold text-clay">{error}</span>}
          </div>
        )}
      </section>

      <section className="card px-6 py-6 mb-6">
        <h2 className="font-extrabold title-tight flex items-center gap-2 mb-5"><Globe className="w-5 h-5 text-pine" /> Network</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <Row k="Name" v={NETWORK.name} />
          <Row k="Chain id" v={String(NETWORK.chainId)} />
          <Row k="Currency" v={`${NETWORK.nativeCurrency.name} (${NETWORK.nativeCurrency.symbol})`} />
          <Row k="Gas" v="Sponsored on this hosted network" />
          <Row k="RPC endpoint" v={NETWORK.rpcUrl} small />
          <Row k="Explorer" v={NETWORK.explorerUrl} small />
        </div>
        <div className="mt-5 pt-4 border-t hairline flex items-center gap-3">
          <span className={`chip ${wallet.chainOk ? "" : "!border-amber/60 !text-[#9c6517]"}`}>
            {wallet.chainOk ? "Wallet on the right chain" : "Wallet not on this chain"}
          </span>
          {!wallet.chainOk && me && (
            <button type="button" onClick={() => wallet.switchNetwork()} className="btn btn-danger text-xs">Switch network</button>
          )}
        </div>
      </section>

      <section className="card px-6 py-6">
        <h2 className="font-extrabold title-tight flex items-center gap-2 mb-5"><Landmark className="w-5 h-5 text-pine" /> Court</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="sm:col-span-2">
            <div className="text-xs font-bold text-fog uppercase tracking-wider mb-1.5 flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Contract address</div>
            <AddrChip addr={CONTRACT_ADDRESS} />
          </div>
          <Row k="Tick" v={snapshot ? `${snapshot.config.tick_seconds} seconds` : "—"} />
          <Row k="Window" v={snapshot ? `${snapshot.config.window_ticks} ticks (${snapshot.config.window_seconds}s)` : "—"} />
          <Row k="Bond" v={snapshot ? `${snapshot.config.bond_bps / 100}% of amount, min ${fmtMoney(snapshot.config.min_bond)}` : "—"} />
          <Row k="Faucet" v={snapshot ? `once, up to ${fmtMoney(snapshot.config.seed_cap)}` : "—"} />
        </div>
        <div className="mt-5 pt-4 border-t hairline">
          <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
            Inspect on the explorer
          </a>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div>
      <div className="text-xs font-bold text-fog uppercase tracking-wider mb-1">{k}</div>
      <div className={`font-extrabold ${small ? "text-xs break-all" : "text-sm"}`}>{v}</div>
    </div>
  );
}
