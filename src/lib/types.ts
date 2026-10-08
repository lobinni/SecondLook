/** Shared shapes for everything the court contract returns. */

export type SpendStatus = "open" | "challenged" | "cleared" | "final" | "reverted";
export type ChallengeStatus = "pending" | "upheld" | "rejected" | "appealed";
export type VerdictLabel = "MATCH" | "MISMATCH" | "INCONCLUSIVE" | "";

/** One line of the payout ledger written when a spend settles. */
export interface FlowLine {
  to: string;
  amount: number;
  why: string;
}

export interface Challenge {
  id: number;
  spend_id: number;
  challenger: string;
  bond: number;
  claim: string;
  counter_url: string;
  /** -1 when no case was cited. */
  cited_case_id: number;
  status: ChallengeStatus;
  verdict_label: VerdictLabel;
  verdict_reason: string;
  evidence_quote: string;
  /** -1 when no ruling has been recorded yet. */
  case_id: number;
  appeal_bond: number;
  appeals: number;
}

export interface Spend {
  id: number;
  payer: string;
  recipient: string;
  amount: number;
  bond: number;
  mandate: string;
  evidence_url: string;
  trace: string;
  /** Unix seconds. */
  opened_at: number;
  challenge_deadline: number;
  appeal_deadline: number;
  status: SpendStatus;
  /** -1 when the spend has no challenge. */
  active_challenge_id: number;
  settlement: FlowLine[];
  challenge: Challenge | null;
}

export interface CaseRecord {
  id: number;
  spend_id: number;
  challenge_id: number;
  round: number;
  label: VerdictLabel;
  reason: string;
  quote: string;
  mandate_hash: string;
  overturned: boolean;
}

export interface CourtConfig {
  tick_seconds: number;
  window_ticks: number;
  window_seconds: number;
  min_bond: number;
  bond_bps: number;
  min_amount: number;
  seed_cap: number;
}

export interface CourtStats {
  spend_count: number;
  challenge_count: number;
  case_count: number;
  total_supply: number;
}

export interface AccountInfo {
  balance: number;
  seeded_amount: number;
}

/** Everything the app reads, in one call. */
export interface Snapshot {
  config: CourtConfig;
  stats: CourtStats;
  spends: Spend[];
  cases: CaseRecord[];
  accounts: Record<string, AccountInfo>;
}
