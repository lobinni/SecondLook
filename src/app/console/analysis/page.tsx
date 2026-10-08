"use client";

import { Quote } from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { EmptyState, PageHead, SkeletonRows, VerdictBadge } from "@/components/ui";

/** Every panel ruling — the docket's case law. */
export default function AnalysisPage() {
  const { snapshot, loading } = useCourt();

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Panel analysis" hint="Every ruling the validator panel has agreed on." />
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const cases = snapshot!.cases;
  const mismatches = cases.filter((c) => c.label === "MISMATCH").length;
  const overturned = cases.filter((c) => c.overturned).length;

  return (
    <div className="rise-in">
      <PageHead
        title="Panel analysis"
        hint={`${cases.length} ruling${cases.length === 1 ? "" : "s"} recorded · ${mismatches} mismatch${mismatches === 1 ? "" : "es"} · ${overturned} overturned on appeal. Each is citeable as precedent.`}
      />
      {cases.length === 0 ? (
        <EmptyState
          title="No rulings yet"
          body="Challenge a live spend and convene the panel — the first consensus verdict writes case #1 and later challengers can cite it."
          action={<Link href="/console/spends" className="btn btn-mint text-xs">Find a spend to challenge</Link>}
        />
      ) : (
        <div className="space-y-5">
          {cases.map((c) => {
            const spend = snapshot!.spends.find((s) => s.id === c.spend_id);
            return (
              <article key={c.id} className="card px-6 py-5 card-hover">
                <div className="flex flex-wrap items-center gap-2.5 mb-3">
                  <span className="label-micro text-fog">Case #{c.id}</span>
                  <VerdictBadge label={c.label} />
                  <span className="verdict-badge border-ink/25 text-fog bg-meadow">Round {c.round}</span>
                  {c.overturned && <span className="verdict-badge border-clay/50 text-clay bg-[#f9e9e4]">Overturned</span>}
                  <Link href={`/console/spends/${c.spend_id}`} className="ml-auto text-xs font-extrabold text-pine hover:underline underline-offset-2">
                    Spend #{c.spend_id} →
                  </Link>
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink/90">{c.reason}</p>
                {c.quote && (
                  <div className="mt-4 border-l-[3px] border-mint bg-mist/50 px-4 py-3">
                    <div className="flex items-center gap-2 label-micro text-pine mb-1.5">
                      <Quote className="w-3.5 h-3.5" /> Verified quotation — word for word from the cited page
                    </div>
                    <p className="text-sm italic font-medium text-ink/80 leading-relaxed">“{c.quote}”</p>
                  </div>
                )}
                {spend && (
                  <p className="mt-4 text-xs text-fog font-semibold leading-relaxed">
                    Mandate under review — {spend.mandate}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
