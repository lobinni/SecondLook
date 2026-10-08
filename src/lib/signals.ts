/**
 * Risk signals — deterministic, rule-based checks over contract state only.
 * If a signal cannot be derived from a spend, a challenge or a ruling, it is
 * never shown.
 */
import type { Snapshot, Spend } from "./types";

export type Severity = "action" | "warn" | "info";

export interface Signal {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href?: string;
  spendId?: number;
}

function windowLeft(spend: Spend, now: number): number {
  return spend.challenge_deadline - now;
}

export function computeSignals(snap: Snapshot, viewer: string | null, now: number): Signal[] {
  const out: Signal[] = [];
  const v = viewer?.toLowerCase() ?? null;

  for (const s of snap.spends) {
    const ch = s.challenge;
    // 1. Open spend whose window has lapsed but nobody finalized it.
    if (s.status === "open" && windowLeft(s, now) <= 0) {
      out.push({
        id: `finalizable-${s.id}`,
        severity: "action",
        title: `Spend #${s.id} can be finalized`,
        detail: "The challenge window has closed and the payout is still locked. Anyone can release it.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 2. Open spend inside its window — an unverified payment a stranger can contest.
    if (s.status === "open" && windowLeft(s, now) > 0 && v && s.payer.toLowerCase() !== v && s.recipient.toLowerCase() !== v) {
      out.push({
        id: `challengeable-${s.id}`,
        severity: "info",
        title: `Spend #${s.id} is open to contest`,
        detail: `A stranger can fund a second look until its window closes.`,
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 3. Challenge filed but the panel has not been convened yet.
    if (s.status === "challenged" && ch?.status === "pending") {
      out.push({
        id: `unruled-${s.id}`,
        severity: "action",
        title: `Spend #${s.id} awaits the panel`,
        detail: "A challenge is bonded and filed. Convening the panel is permissionless.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 4. Appeal announced but not yet re-ruled.
    if (s.status === "challenged" && ch?.status === "appealed") {
      out.push({
        id: `appeal-pending-${s.id}`,
        severity: "warn",
        title: `Spend #${s.id} has a live appeal`,
        detail: "A second panel round is bonded and waiting to run.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 5. Viewer is a losing challenger who can still appeal or accept.
    if (s.status === "cleared" && ch?.status === "rejected" && v && ch.challenger.toLowerCase() === v && s.appeal_deadline > now && ch.appeals === 0) {
      out.push({
        id: `appeal-yours-${s.id}`,
        severity: "warn",
        title: `Your challenge on spend #${s.id} lost`,
        detail: "You can appeal once, or accept the ruling so the recipient is paid without waiting.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 6. Cleared spend whose appeal window has lapsed without an appeal.
    if (s.status === "cleared" && s.appeal_deadline <= now) {
      out.push({
        id: `cleared-finalizable-${s.id}`,
        severity: "action",
        title: `Spend #${s.id} outlived its appeal window`,
        detail: "The rejected challenge is final. Anyone can settle the payout.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
    // 7. Reverted because the evidence page could not be retrieved at all.
    if (s.status === "reverted" && ch?.verdict_label === "MISMATCH" && /could not be retrieved/i.test(ch.verdict_reason)) {
      out.push({
        id: `vanished-${s.id}`,
        severity: "info",
        title: `Spend #${s.id} cited a page that could not be retrieved`,
        detail: "The payer chose the source; an unreachable source cannot rescue a spend.",
        href: `/console/spends/${s.id}`,
        spendId: s.id,
      });
    }
  }
  return out;
}

/** Ranked opportunities for the radar panel. */
export interface Opportunity {
  spend: Spend;
  kind: "finalize" | "contest" | "convene" | "appeal";
  headline: string;
  note: string;
}

export function computeOpportunities(snap: Snapshot, viewer: string | null, now: number): Opportunity[] {
  const out: Opportunity[] = [];
  const v = viewer?.toLowerCase() ?? null;
  for (const s of snap.spends) {
    if (s.status === "open" && s.challenge_deadline <= now) {
      out.push({ spend: s, kind: "finalize", headline: "Ready to finalize", note: "Window closed, funds still locked." });
    } else if (s.status === "challenged" && s.challenge?.status === "pending") {
      out.push({ spend: s, kind: "convene", headline: "Panel not convened", note: "Anyone can run the ruling round." });
    } else if (s.status === "cleared" && s.appeal_deadline <= now) {
      out.push({ spend: s, kind: "finalize", headline: "Appeal window lapsed", note: "The payout can settle now." });
    } else if (
      s.status === "cleared" && v && s.challenge?.challenger.toLowerCase() === v &&
      s.challenge.status === "rejected" && s.challenge.appeals === 0
    ) {
      out.push({ spend: s, kind: "appeal", headline: "Appeal still open", note: "One second panel round is available." });
    } else if (s.status === "open" && (!v || (s.payer.toLowerCase() !== v && s.recipient.toLowerCase() !== v))) {
      out.push({ spend: s, kind: "contest", headline: "Open to contest", note: "Fund a second look with an equal bond." });
    }
  }
  const rank = { finalize: 0, convene: 1, appeal: 2, contest: 3 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.spend.id - a.spend.id);
}
