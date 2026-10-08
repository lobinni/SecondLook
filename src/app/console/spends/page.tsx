"use client";

import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useCourt } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import { countdown, shortAddr, toCsv } from "@/lib/format";
import { computeOpportunities } from "@/lib/signals";
import { cn } from "@/lib/cn";
import { CardLink, EmptyState, PageHead, SkeletonRows, StatusBadge, VerdictBadge } from "@/components/ui";
import type { Spend } from "@/lib/types";

type Tab = "opportunities" | "disputes" | "won" | "lost";

const TABS: { id: Tab; label: string }[] = [
  { id: "opportunities", label: "Opportunities" },
  { id: "disputes", label: "Active disputes" },
  { id: "won", label: "Challenges won" },
  { id: "lost", label: "Challenges lost" },
];

export default function SpendsPage() {
  const { snapshot, loading, now, wallet } = useCourt();
  const [tab, setTab] = useState<Tab>("opportunities");
  const [query, setQuery] = useState("");

  const me = wallet.account?.toLowerCase() ?? null;
  const spends = snapshot?.spends ?? [];

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    let list: Spend[];
    if (tab === "opportunities") {
      list = computeOpportunities(snapshot, me, now).map((o) => o.spend);
    } else if (tab === "disputes") {
      list = spends.filter((s) => s.status === "challenged" || s.status === "cleared");
    } else if (tab === "won") {
      list = spends.filter((s) => s.status === "reverted");
    } else {
      list = spends.filter((s) => s.status === "final" && s.challenge);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        `${s.id} ${s.mandate} ${s.payer} ${s.recipient} ${s.status} ${s.challenge?.claim ?? ""}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [snapshot, spends, tab, query, me, now]);

  const counts = useMemo(() => {
    if (!snapshot) return { opportunities: 0, disputes: 0, won: 0, lost: 0 };
    return {
      opportunities: computeOpportunities(snapshot, me, now).length,
      disputes: spends.filter((s) => s.status === "challenged" || s.status === "cleared").length,
      won: spends.filter((s) => s.status === "reverted").length,
      lost: spends.filter((s) => s.status === "final" && s.challenge).length,
    };
  }, [snapshot, spends, me, now]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["id", "status", "amount_tusd", "bond_tusd", "payer", "recipient", "evidence", "verdict", "opened_at"],
      ...filtered.map((s) => [
        s.id,
        s.status,
        (s.amount / 1_000_000).toFixed(2),
        (s.bond / 1_000_000).toFixed(2),
        s.payer,
        s.recipient,
        s.evidence_url,
        s.challenge?.verdict_label ?? "",
        new Date(s.opened_at * 1000).toISOString(),
      ]),
    ];
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `secondlook-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rise-in">
      <PageHead
        title="Spends"
        hint="The same dollars, sliced by where they are. Search, filter, export — every row is chain state."
        right={
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="btn btn-ghost text-xs">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn("chip transition-colors", tab === t.id ? "!bg-night !text-mint !border-night" : "hover:border-ink")}
          >
            {t.label}
            <span className={cn("ml-1 text-[11px] font-extrabold", tab === t.id ? "text-mint/70" : "text-ash")}>{counts[t.id]}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-72">
          <Search className="w-4 h-4 text-ash absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="input !pl-10"
            placeholder="Search mandate, address, id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && !snapshot ? (
        <SkeletonRows rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? "Nothing matches" : "This slice is empty"}
          body={
            query
              ? `No spend in “${TABS.find((t) => t.id === tab)?.label}” contains “${query}”.`
              : tab === "opportunities"
                ? "Nothing to contest, convene or settle right now. New spends land here immediately."
                : "Spends move through these lists as windows close and panels rule."
          }
        />
      ) : (
        <div className="border hairline bg-paper divide-y divide-[#0b121017]">
          {filtered.map((s) => (
            <CardLink key={s.id} href={`/console/spends/${s.id}`} className="!border-0 row-line px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="label-micro text-fog">Spend #{s.id}</span>
                    <StatusBadge status={s.status} />
                    {s.challenge?.verdict_label && <VerdictBadge label={s.challenge.verdict_label} />}
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-1">{s.mandate}</p>
                  <div className="mt-1.5 text-xs text-fog font-semibold">
                    {shortAddr(s.payer)} → {shortAddr(s.recipient)}
                    {s.challenge && <> · challenged by {shortAddr(s.challenge.challenger)}</>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold">{fmtMoney(s.amount)}</div>
                  <div className="text-xs text-fog font-semibold mt-0.5">
                    {s.status === "open"
                      ? countdown(s.challenge_deadline, now)
                      : s.status === "cleared"
                        ? `appeal ${countdown(s.appeal_deadline, now)}`
                        : s.status === "challenged"
                          ? "panel stage"
                          : `bond ${fmtMoney(s.bond)}`}
                  </div>
                </div>
              </div>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
