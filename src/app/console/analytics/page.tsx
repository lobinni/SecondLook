"use client";

import { useMemo } from "react";
import { useCourt } from "@/lib/store";
import { fmtAmount } from "@/lib/money";
import { Bars, Donut, Trend } from "@/components/charts";
import { EmptyState, PageHead, SkeletonRows } from "@/components/ui";

/** Charts that each answer exactly one question. */
export default function AnalyticsPage() {
  const { snapshot, loading } = useCourt();

  const data = useMemo(() => {
    if (!snapshot) return null;
    const spends = snapshot.spends;
    const byStatus = [
      { label: "Open", value: spends.filter((s) => s.status === "open").length, color: "#35d5b4" },
      { label: "Challenged", value: spends.filter((s) => s.status === "challenged" || s.status === "cleared").length, color: "#f0a74b" },
      { label: "Final", value: spends.filter((s) => s.status === "final").length, color: "#087f71" },
      { label: "Reverted", value: spends.filter((s) => s.status === "reverted").length, color: "#c45b3e" },
    ];
    const volume = [
      { label: "Open", value: spends.filter((s) => s.status === "open").reduce((a, s) => a + s.amount, 0) / 1e6 },
      { label: "In dispute", value: spends.filter((s) => s.status === "challenged" || s.status === "cleared").reduce((a, s) => a + s.amount, 0) / 1e6 },
      { label: "Paid out", value: spends.filter((s) => s.status === "final").reduce((a, s) => a + s.amount, 0) / 1e6 },
      { label: "Reverted", value: spends.filter((s) => s.status === "reverted").reduce((a, s) => a + s.amount, 0) / 1e6 },
    ].map((d) => ({ ...d, hint: `${d.value.toFixed(2)} tUSD`, color: d.label === "Reverted" ? "#c45b3e" : d.label === "In dispute" ? "#f0a74b" : "#35d5b4" }));

    const challenged = spends.filter((s) => s.challenge);
    const upheld = spends.filter((s) => s.status === "reverted").length;
    const bondMoved = spends.reduce(
      (a, s) => a + s.settlement.filter((f) => /bond/i.test(f.why)).reduce((x, f) => x + f.amount, 0),
      0,
    );
    // cumulative rulings over time, bucketed by day
    const byDay = new Map<string, number>();
    const sorted = [...snapshot.cases].sort((a, b) => a.id - b.id);
    let acc = 0;
    for (const c of sorted) {
      const spend = spends.find((s) => s.id === c.spend_id);
      const day = spend ? new Date(spend.opened_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `Case ${c.id}`;
      acc += 1;
      byDay.set(day, acc);
    }
    const trend = byDay.size > 0 ? [...byDay.entries()].map(([x, y]) => ({ x, y })) : [];
    return { byStatus, volume, challengeRate: { challenged: challenged.length, total: spends.length }, upheld, bondMoved, trend };
  }, [snapshot]);

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Analytics" hint="Each chart answers one question." />
        <SkeletonRows rows={3} />
      </div>
    );
  }
  if (!data || snapshot!.spends.length === 0) {
    return (
      <div className="rise-in">
        <PageHead title="Analytics" hint="Each chart answers one question." />
        <EmptyState title="Nothing to chart yet" body="Charts draw themselves from spends, challenges and rulings as they happen." />
      </div>
    );
  }

  return (
    <div className="rise-in">
      <PageHead title="Analytics" hint="Each chart answers one question. All of them read only the court's own state." />
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card px-6 py-6">
          <h3 className="font-extrabold title-tight mb-1">Where are the spends?</h3>
          <p className="text-xs text-fog font-semibold mb-5">Count by status, right now</p>
          <Donut parts={data.byStatus} centerValue={String(snapshot!.spends.length)} centerLabel="spends" />
        </section>

        <section className="card px-6 py-6">
          <h3 className="font-extrabold title-tight mb-1">Where is the money?</h3>
          <p className="text-xs text-fog font-semibold mb-5">Principal volume by outcome (tUSD)</p>
          <Bars data={data.volume} />
        </section>

        <section className="card px-6 py-6">
          <h3 className="font-extrabold title-tight mb-1">How often do strangers step in?</h3>
          <p className="text-xs text-fog font-semibold mb-5">Challenged vs untroubled spends</p>
          <Donut
            parts={[
              { label: "Challenged", value: data.challengeRate.challenged, color: "#f0a74b" },
              { label: "Untroubled", value: data.challengeRate.total - data.challengeRate.challenged, color: "#35d5b4" },
            ]}
            centerValue={`${data.challengeRate.total ? Math.round((data.challengeRate.challenged / data.challengeRate.total) * 100) : 0}%`}
            centerLabel="contested"
          />
        </section>

        <section className="card px-6 py-6">
          <h3 className="font-extrabold title-tight mb-1">Case law over time</h3>
          <p className="text-xs text-fog font-semibold mb-5">Cumulative panel rulings</p>
          {data.trend.length > 1 ? (
            <Trend points={data.trend} label={`${snapshot!.cases.length} rulings`} />
          ) : (
            <div className="h-[120px] flex items-center justify-center text-sm text-fog font-medium border hairline bg-mist/40">
              One ruling so far — the curve starts at case #2.
            </div>
          )}
        </section>

        <section className="card px-6 py-6 lg:col-span-2">
          <h3 className="font-extrabold title-tight mb-1">Consequences</h3>
          <p className="text-xs text-fog font-semibold mb-5">Bond value that changed hands through settlements</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border hairline px-5 py-4">
              <div className="label-micro text-fog mb-1.5">Bonds moved</div>
              <div className="text-2xl font-extrabold title-tight">{fmtAmount(data.bondMoved)} <span className="text-sm text-fog">tUSD</span></div>
            </div>
            <div className="border hairline px-5 py-4">
              <div className="label-micro text-fog mb-1.5">Challenges upheld</div>
              <div className="text-2xl font-extrabold title-tight">{data.upheld}</div>
            </div>
            <div className="border hairline px-5 py-4">
              <div className="label-micro text-fog mb-1.5">Challenges defeated</div>
              <div className="text-2xl font-extrabold title-tight">{Math.max(0, data.challengeRate.challenged - data.upheld)}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
