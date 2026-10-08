"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  Eye,
  FileSearch,
  Gavel,
  HandMetal,
  Landmark,
  Lock,
  Radio,
  RotateCcw,
  ShieldCheck,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { CONTRACT_ADDRESS, CONTRACT_READY, explorerAddressUrl, NETWORK } from "@/lib/config";
import { fmtAmount, fmtCompact } from "@/lib/money";
import { PRESETS } from "@/lib/presets";
import { Logo } from "./Logo";
import { StatusBadge, VerdictBadge } from "./ui";
import { WalletButton } from "./WalletButton";

export function Landing() {
  const { snapshot, now } = useCourt();
  const spends = snapshot?.spends ?? [];
  const stats = snapshot?.stats;
  const openCount = spends.filter((s) => s.status === "open" || s.status === "challenged" || s.status === "cleared").length;
  const featured = spends.slice(0, 3);

  return (
    <div className="min-h-screen grid-paper">
      {/* ── nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b hairline bg-sage/90 backdrop-blur">
        <div className="mx-auto max-w-[1220px] px-5 h-16 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-extrabold text-lg title-tight tracking-tight">SecondLook</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-fog ml-4">
            <a href="#how" className="hover:text-ink transition-colors">How it moves</a>
            <a href="#economics" className="hover:text-ink transition-colors">Economics</a>
            <a href="#sources" className="hover:text-ink transition-colors">Live sources</a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <WalletButton compact />
            <Link href="/console" className="btn btn-ink text-xs">
              Open console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1220px] px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div className="rise-in">
            <div className="chip mb-6">
              <span className="w-2 h-2 bg-mint animate-pulse-dot" />
              {NETWORK.name} · Chain {NETWORK.chainId} · Gasless
            </div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold title-tight leading-[1.02]">
              Every agent payment earns a{" "}
              <span className="relative inline-block text-pine">
                second&nbsp;look
                <span className="absolute left-0 -bottom-1 w-full h-[6px] bg-mint/70" aria-hidden />
              </span>
            </h1>
            <p className="mt-6 text-lg text-fog font-medium max-w-xl leading-relaxed">
              An agent releases a payment against a one-line mandate. For a short window,
              any stranger can post a counter-bond and force a second look; an independent
              validator panel reads the mandate and the live pages, and its word moves the money.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/console" className="btn btn-mint">
                Launch the console <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how" className="btn btn-ghost">See how it moves</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
              <HeroStat value={stats ? String(openCount) : "—"} label="spends under watch" />
              <HeroStat value={stats ? String(stats.challenge_count) : "—"} label="challenges funded" />
              <HeroStat value={stats ? String(stats.case_count) : "—"} label="panel rulings" />
            </div>
          </div>

          {/* floating live cards */}
          <div className="relative h-[440px] hidden lg:block" aria-label="Live court activity">
            <div className="absolute inset-6 border hairline bg-paper/60 shadow-hard" />
            {featured.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="card px-6 py-5 shadow-lift-sm animate-node-float">
                  <div className="skeleton h-3 w-40 mb-2.5" />
                  <div className="skeleton h-3 w-56" />
                </div>
              </div>
            )}
            {featured.map((s, i) => {
              const pos = [
                "left-2 top-4",
                "right-2 top-36",
                "left-16 bottom-2",
              ][i % 3];
              const tilts = ["-2deg", "1.5deg", "-1deg"];
              return (
                <Link
                  key={s.id}
                  href={`/console/spends/${s.id}`}
                  className={`absolute ${pos} w-72 card shadow-lift-sm px-5 py-4 animate-node-float`}
                  style={{ animationDelay: `${i * 1.4}s`, ["--tilt" as string]: tilts[i % 3] }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="label-micro text-fog">Spend #{s.id}</span>
                    {s.challenge?.verdict_label ? (
                      <VerdictBadge label={s.challenge.verdict_label} />
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{s.mandate}</p>
                  <div className="mt-3 pt-3 border-t hairline flex items-center justify-between text-xs font-bold">
                    <span className="text-pine">{fmtAmount(s.amount)} tUSD</span>
                    <span className="text-fog">
                      {s.status === "open" ? `window closes ${new Date(s.challenge_deadline * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}` : `bond ${fmtAmount(s.bond)}`}
                    </span>
                  </div>
                </Link>
              );
            })}
            <div className="absolute -right-1 bottom-20 chip bg-night text-mint border-night animate-node-float-slow">
              <Radio className="w-3.5 h-3.5" /> Live docket
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="relative border-y hairline bg-paper overflow-hidden py-3 select-none" aria-hidden>
          <div className="flex w-max animate-ticker gap-10 whitespace-nowrap text-[12px] font-extrabold tracking-[0.18em] uppercase text-fog">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k} className="flex gap-10">
                {["Standing veto", `Chain ${NETWORK.chainId}`, "Gasless writes", "No owner keys", "Panel-verified quotes", "Permissionless finalize", "Case law on-chain", "Equal counter-bonds"].map((t) => (
                  <span key={t} className="flex items-center gap-10">
                    {t} <span className="w-1.5 h-1.5 bg-mint rotate-45 inline-block" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it moves ────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-[1220px] px-5 py-20 md:py-24">
        <div className="mb-12">
          <div className="label-micro text-pine mb-3">The flow</div>
          <h2 className="text-4xl md:text-5xl font-extrabold title-tight">How a payment moves</h2>
          <p className="text-fog font-medium mt-4 max-w-2xl">
            Five states, eight public actions, zero privileged keys. A number only exists on
            these cards if the contract itself can produce it.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 border hairline bg-paper">
          {[
            { icon: Lock, step: "01", title: "Open", body: "The payer locks amount + bond behind a mandate, a cited page and the agent's trace. Nothing reaches the recipient yet." },
            { icon: HandMetal, step: "02", title: "Challenge", body: "Within the window, any stranger posts an equal bond and files a claim — optionally a counter-page and a cited case." },
            { icon: Gavel, step: "03", title: "Rule", body: "Anyone convenes the panel. Validators fetch the pages themselves and must agree on MATCH, MISMATCH or INCONCLUSIVE." },
            { icon: RotateCcw, step: "04", title: "Appeal", body: "A losing challenger can post one more bond. The panel re-runs with the first ruling as advisory context." },
            { icon: Coins, step: "05", title: "Settle", body: "Unchallenged spends pay out when the window lapses. Upheld challenges revert everything to the challenger and payer." },
          ].map((s, i) => (
            <div key={s.step} className={`px-6 py-7 ${i > 0 ? "border-t lg:border-t-0 lg:border-l" : ""} hairline`}>
              <div className="flex items-center justify-between mb-5">
                <s.icon className="w-5 h-5 text-pine" />
                <span className="label-micro text-ash">{s.step}</span>
              </div>
              <h3 className="font-extrabold text-lg title-tight mb-2">{s.title}</h3>
              <p className="text-sm text-fog font-medium leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          <div className="card card-hover px-6 py-6 shadow-edge-mint">
            <Eye className="w-5 h-5 text-pine mb-3" />
            <h4 className="font-extrabold title-tight mb-1.5">The quote is checked word for word</h4>
            <p className="text-sm text-fog font-medium">A ruling must cite verbatim text from the pages the panel actually read, or it is discarded.</p>
          </div>
          <div className="card card-hover px-6 py-6 shadow-edge-mint">
            <ShieldCheck className="w-5 h-5 text-pine mb-3" />
            <h4 className="font-extrabold title-tight mb-1.5">Injection-proof by construction</h4>
            <p className="text-sm text-fog font-medium">Page text is data, never instructions. A page that begs the panel for a label only incriminates itself.</p>
          </div>
          <div className="card card-hover px-6 py-6 shadow-edge-mint">
            <Vote className="w-5 h-5 text-pine mb-3" />
            <h4 className="font-extrabold title-tight mb-1.5">Rulings become case law</h4>
            <p className="text-sm text-fog font-medium">Every verdict is a numbered case later challengers can cite, and appeals can overturn.</p>
          </div>
        </div>
      </section>

      {/* ── night section: economics ────────────────────────────── */}
      <section id="economics" className="night-grid text-paper relative">
        <div className="mx-auto max-w-[1220px] px-5 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <div>
              <div className="label-micro text-mint mb-4">Economics of doubt</div>
              <h2 className="text-4xl md:text-5xl font-extrabold title-tight leading-tight">
                The first verdict is trusted because a stranger can fund a second one
              </h2>
              <p className="mt-5 text-paper/70 font-medium leading-relaxed">
                This is not escrow between two parties who agreed to argue. It is a standing,
                permissionless check that sits on every autonomous payment. The contract has
                no owner, admin, operator or pause key — delete the consensus call and a
                challenged spend can never settle at all.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {CONTRACT_READY ? (
                  <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="btn btn-night text-xs">
                    Inspect the court <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="chip !bg-transparent !text-amber !border-amber/50">
                    No court linked yet — deploy one to light up this page
                  </span>
                )}
                <Link href="/console/help" className="btn btn-night text-xs">Read the rules</Link>
              </div>
            </div>
            <div className="border hairline-night bg-[#0a1a15]">
              {[
                { k: "Payer bond", v: "10% of the amount", s: "never less than 5.00 tUSD" },
                { k: "Counter-bond", v: "Equal to the payer's", s: "posted by a stranger, never a party" },
                { k: "Windows", v: "3 ticks each", s: snapshot ? `${snapshot.config.window_seconds}s per window at current tick` : "challenge and appeal" },
                { k: "False challenge", v: "Slashed 50 / 50", s: "half to the payer, half to the recipient" },
                { k: "Upheld challenge", v: "Challenger collects", s: "both bonds, plus their stake back" },
                { k: "Appeal", v: "Once, challenger only", s: "losing it forfeits the appeal bond" },
              ].map((r, i) => (
                <div key={r.k} className={`px-6 py-4 flex items-baseline justify-between gap-6 ${i > 0 ? "border-t hairline-night" : ""}`}>
                  <span className="text-sm font-bold text-paper/60">{r.k}</span>
                  <span className="text-right">
                    <span className="block font-extrabold text-mint">{r.v}</span>
                    <span className="block text-xs text-paper/45 font-medium">{r.s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mt-14">
            <div className="border hairline-night px-6 py-6 bg-[#0a1a15]">
              <div className="label-micro text-mint/70 mb-2">Ledger in circulation</div>
              <div className="text-3xl font-extrabold title-tight">{stats ? fmtCompact(stats.total_supply) : "—"}</div>
              <div className="text-xs text-paper/45 mt-1 font-medium">test funds, minted by the faucet</div>
            </div>
            <div className="border hairline-night px-6 py-6 bg-[#0a1a15]">
              <div className="label-micro text-mint/70 mb-2">Spends ever opened</div>
              <div className="text-3xl font-extrabold title-tight">{stats ? stats.spend_count : "—"}</div>
              <div className="text-xs text-paper/45 mt-1 font-medium">each one open to contest on arrival</div>
            </div>
            <div className="border hairline-night px-6 py-6 bg-[#0a1a15]">
              <div className="label-micro text-mint/70 mb-2">Current tick</div>
              <div className="text-3xl font-extrabold title-tight">{snapshot ? `${snapshot.config.tick_seconds}s` : "—"}</div>
              <div className="text-xs text-paper/45 mt-1 font-medium">fixed at deployment, never changeable</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── live sources ────────────────────────────────────────── */}
      <section id="sources" className="mx-auto max-w-[1220px] px-5 py-20 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-micro text-pine mb-3">Real sources, not fixtures</div>
            <h2 className="text-4xl md:text-5xl font-extrabold title-tight">The panel rules on live pages</h2>
            <p className="text-fog font-medium mt-4 max-w-2xl">
              Every scenario cites a public page nobody here controls. Validators fetch it
              themselves; the mandate and the page decide the outcome.
            </p>
          </div>
          <Link href="/console/spends?new=1" className="btn btn-ghost text-xs">Open one now <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRESETS.map((p) => (
            <div key={p.id} className="card card-hover px-6 py-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <FileSearch className="w-5 h-5 text-pine" />
                <span className={`verdict-badge ${p.expectation === "usually-match" ? "border-pine/50 text-pine bg-mist" : p.expectation === "usually-mismatch" ? "border-clay/50 text-clay bg-[#f9e9e4]" : "border-amber/60 text-[#9c6517] bg-[#fdf2e2]"}`}>
                  {p.expectation === "live" ? "Live verdict" : p.expectation === "usually-match" ? "Should survive" : "Should revert"}
                </span>
              </div>
              <h4 className="font-extrabold title-tight mb-1.5">{p.name}</h4>
              <p className="text-sm text-fog font-medium flex-1">{p.blurb}</p>
              <div className="mt-4 pt-3 border-t hairline text-xs font-bold text-fog truncate">
                {p.evidenceUrl.replace(/^https:\/\//, "")}
              </div>
            </div>
          ))}
          <div className="card px-6 py-6 night-grid text-paper flex flex-col justify-between">
            <div>
              <Landmark className="w-5 h-5 text-mint mb-3" />
              <h4 className="font-extrabold title-tight mb-1.5">Your mandate here</h4>
              <p className="text-sm text-paper/60 font-medium">
                Write any one-paragraph claim over any public https page. The panel treats your text as data, never as instructions.
              </p>
            </div>
            <Link href="/console/spends?new=1" className="btn btn-mint text-xs mt-6 self-start">Open a custom spend</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="border-t hairline bg-paper">
        <div className="mx-auto max-w-[1220px] px-5 py-16 md:py-20 flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold title-tight">Watch every spend. Challenge any of them.</h2>
            <p className="text-fog font-medium mt-3 max-w-xl">
              Connect a wallet on Studionet (chain {NETWORK.chainId}), claim faucet funds once,
              and every action on the docket is yours.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/console" className="btn btn-mint">Enter the console <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t hairline">
        <div className="mx-auto max-w-[1220px] px-5 py-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-semibold text-fog">
          <span className="flex items-center gap-2"><Logo size={18} /> <span className="font-extrabold text-ink">SecondLook</span></span>
          <span>{NETWORK.name} · chain {NETWORK.chainId}</span>
          <span className="ml-auto">All balances are test funds held in the court's own ledger — nothing here is real money.</span>
        </div>
      </footer>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-extrabold title-tight text-ink">{value}</span>
      <span className="text-xs font-bold uppercase tracking-wider text-fog">{label}</span>
    </div>
  );
}
