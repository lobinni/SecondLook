"use client";

import { ExternalLink, FileSearch } from "lucide-react";
import Link from "next/link";
import { useCourt } from "@/lib/store";
import { hostOf } from "@/lib/format";
import { EmptyState, PageHead, SkeletonRows, StatusBadge } from "@/components/ui";

/** Every page ever cited — evidence and counter-pages, deduplicated. */
export default function EvidencePage() {
  const { snapshot, loading } = useCourt();

  if (loading && !snapshot) {
    return (
      <div>
        <PageHead title="Evidence" hint="Every page the docket cites." />
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const spends = snapshot!.spends;
  const pages = new Map<string, { url: string; roles: { kind: string; spendId: number; status: string }[] }>();
  for (const s of spends) {
    const add = (url: string, kind: string) => {
      if (!url) return;
      const entry = pages.get(url) ?? { url, roles: [] };
      entry.roles.push({ kind, spendId: s.id, status: s.status });
      pages.set(url, entry);
    };
    add(s.evidence_url, "Payer evidence");
    if (s.challenge?.counter_url) add(s.challenge.counter_url, "Challenger counter-page");
  }
  const list = [...pages.values()];

  return (
    <div className="rise-in">
      <PageHead
        title="Evidence"
        hint={`${list.length} unique page${list.length === 1 ? "" : "s"} cited across ${spends.length} spend${spends.length === 1 ? "" : "s"}. Validators fetch each one live at ruling time.`}
      />
      {list.length === 0 ? (
        <EmptyState title="No citations yet" body="Evidence pages appear the moment the first spend is opened." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((p) => (
            <div key={p.url} className="card card-hover px-5 py-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-2">
                <FileSearch className="w-4 h-4 text-pine shrink-0" />
                <span className="font-extrabold text-sm truncate">{hostOf(p.url)}</span>
              </div>
              <div className="mute-id truncate mb-4">{p.url}</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {p.roles.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <Link href={`/console/spends/${r.spendId}`} className="verdict-badge border-ink/25 text-fog bg-meadow hover:border-ink">
                      {r.kind} · #{r.spendId}
                    </Link>
                    <StatusBadge status={r.status} />
                  </span>
                ))}
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs mt-auto self-start">
                Read the page <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
      <p className="mt-8 text-sm text-fog font-medium max-w-2xl card px-5 py-4">
        A page that cannot be retrieved at ruling time counts as evidence <em>against</em> the spend that cited it —
        the payer chose the source, and a vanished source cannot rescue the payment.
      </p>
    </div>
  );
}
