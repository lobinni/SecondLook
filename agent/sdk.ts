/**
 * SecondLook SDK for agents.
 *
 * Two roles use it. A **payer agent** opens a spend instead of paying
 * outright: it locks the amount and a bond behind a one-paragraph mandate and
 * the page it relied on. A **watchdog** is a stranger who reads open spends,
 * checks each cited page for itself and, if the page contradicts the mandate,
 * funds a second look and convenes the validator panel.
 *
 * Everything goes through the deployed contract; this file decides nothing.
 * Amounts are integer micro-units (1,000,000 = 1.00), exactly as the
 * contract stores them.
 *
 * Run with:  npx tsx agent/payer-agent.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const MICROS = 1_000_000;

export interface SecondLookOptions {
  /** 0x-prefixed 32-byte key. Omit to use a fresh throwaway key. */
  privateKey?: `0x${string}`;
  contract: `0x${string}`;
  rpcUrl?: string;
  chainId?: number;
}

export interface OpenSpendInput {
  recipient: string;
  /** Integer micro-units. */
  amount: number;
  mandate: string;
  evidenceUrl: string;
  trace: string;
}

function chainOf(opts: SecondLookOptions) {
  const base = (opts.chainId ?? 61999) === 61127 ? localnet : studionet;
  return {
    ...base,
    id: opts.chainId ?? 61999,
    rpcUrls: { default: { http: [opts.rpcUrl ?? "https://studio.genlayer.com/api"] } },
  };
}

function describeError(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string; cause?: { message?: string } };
  return e?.shortMessage || e?.cause?.message || e?.message || String(err);
}

export function bondFor(amount: number, bondBps = 1000, minBond = 5_000_000): number {
  return Math.max(Math.floor((amount * bondBps) / 10_000), minBond);
}

export class SecondLook {
  readonly privateKey: `0x${string}`;
  readonly address: `0x${string}`;
  private readonly client: ReturnType<typeof createClient>;
  private readonly contract: `0x${string}`;

  constructor(opts: SecondLookOptions) {
    this.privateKey = opts.privateKey ?? generatePrivateKey();
    const account = createAccount(this.privateKey);
    this.address = account.address;
    this.client = createClient({ chain: chainOf(opts), account });
    this.contract = opts.contract;
  }

  // ------------------------------------------------------------------ reads
  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const raw = await this.client.readContract({ address: this.contract, functionName, args: args as never });
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  }

  config(): Promise<{
    tick_seconds: number; window_ticks: number; window_seconds: number;
    min_bond: number; bond_bps: number; min_amount: number; seed_cap: number;
  }> {
    return this.read("get_config");
  }

  balance(address: string = this.address): Promise<number> {
    return this.client
      .readContract({ address: this.contract, functionName: "get_balance", args: [address] })
      .then((v) => Number(v));
  }

  spends(): Promise<
    {
      id: number; payer: string; recipient: string; amount: number; bond: number;
      mandate: string; evidence_url: string; trace: string; opened_at: number;
      challenge_deadline: number; appeal_deadline: number; status: string;
      active_challenge_id: number;
    }[]
  > {
    return this.read("list_all");
  }

  spend(id: number) {
    return this.read<Record<string, never> & { id: number; status: string; active_challenge_id: number }>(
      "get_spend",
      [id],
    );
  }

  challengeOf(challengeId: number) {
    return this.read<{ id: number; spend_id: number; status: string } & Record<string, unknown>>(
      "get_challenge",
      [challengeId],
    );
  }

  cases() {
    return this.read<{ id: number; label: string; reason: string }[]>("list_cases");
  }

  /** Spends still flagged open; the window check happens on the contract. */
  async challengeable(): Promise<Awaited<ReturnType<SecondLook["spends"]>>> {
    const now = Math.floor(Date.now() / 1000);
    return (await this.spends()).filter(
      (s) => s.status === "open" && now < s.challenge_deadline,
    );
  }

  // ----------------------------------------------------------------- writes
  private async write(functionName: string, args: unknown[]): Promise<string> {
    const hash = (await this.client.writeContract({
      address: this.contract,
      functionName,
      args: args as never,
      value: BigInt(0),
    })) as `0x${string}`;
    await this.client.waitForTransactionReceipt({
      hash: hash as never,
      status: TransactionStatus.ACCEPTED,
      retries: 200,
      interval: 3000,
    });
    return hash;
  }

  /** Mint faucet funds once, if this key has not claimed them yet. */
  async seedIfNeeded(amount = 1_000 * MICROS): Promise<void> {
    if ((await this.balance()) > 0) return;
    try {
      await this.write("seed", [amount]);
    } catch (e) {
      if (!/already been seeded/.test(describeError(e))) throw e;
    }
  }

  /** What opening a spend of `amount` locks: the amount plus the bond. */
  async cost(amount: number): Promise<{ bond: number; total: number }> {
    const cfg = await this.config();
    const bond = bondFor(amount, cfg.bond_bps, cfg.min_bond);
    return { bond, total: amount + bond };
  }

  async openSpend(input: OpenSpendInput): Promise<{ spendId: number; hash: string }> {
    const before = (await this.spends()).map((s) => s.id);
    const hash = await this.write("open_spend", [
      input.recipient,
      input.amount,
      input.mandate,
      input.evidenceUrl,
      input.trace,
    ]);
    const mine = (await this.spends()).find(
      (s) =>
        !before.includes(s.id) &&
        s.payer.toLowerCase() === this.address.toLowerCase(),
    );
    if (!mine) throw new Error("The spend was accepted but could not be found in the contract's list.");
    return { spendId: mine.id, hash };
  }

  async challenge(
    spendId: number,
    claim: string,
    counterUrl = "",
    precedentCaseId = 0,
  ): Promise<{ challengeId: number; hash: string }> {
    const hash = await this.write("challenge", [spendId, claim, counterUrl, precedentCaseId]);
    const s = await this.spend(spendId);
    return { challengeId: Number(s.active_challenge_id), hash };
  }

  /** Convene the validator panel. The label comes only from consensus. */
  async rule(challengeId: number): Promise<Record<string, unknown>> {
    await this.write("rule", [challengeId]);
    return this.challengeOf(challengeId) as Promise<Record<string, unknown>>;
  }

  async appeal(challengeId: number): Promise<string> {
    return this.write("appeal", [challengeId]);
  }

  async ruleAppeal(challengeId: number): Promise<Record<string, unknown>> {
    await this.write("rule_appeal", [challengeId]);
    return this.challengeOf(challengeId) as Promise<Record<string, unknown>>;
  }

  async acceptRuling(challengeId: number): Promise<string> {
    return this.write("accept_ruling", [challengeId]);
  }

  async finalize(spendId: number): Promise<string> {
    return this.write("finalize", [spendId]);
  }
}

/**
 * Read `SecondLookOptions` from the environment the way the example agents do.
 * Address resolution chain (shared with the app and the live script):
 *   1. CONTRACT_ADDRESS / NEXT_PUBLIC_CONTRACT_ADDRESS environment variables
 *   2. .env.local (written by the deploy script)
 *   3. the current deployment recorded in deploy/deployments.json
 */
export function optionsFromEnv(env: NodeJS.ProcessEnv = process.env): SecondLookOptions {
  let contract = env.CONTRACT_ADDRESS ?? env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) {
    try {
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
      const envFile = join(root, ".env.local");
      if (existsSync(envFile)) {
        const m = readFileSync(envFile, "utf8").match(/NEXT_PUBLIC_CONTRACT_ADDRESS=(0x[0-9a-fA-F]{40})/);
        if (m) contract = m[1];
      }
    } catch {
      /* keep falling through */
    }
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) {
    try {
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
      const all = JSON.parse(readFileSync(join(root, "deploy", "deployments.json"), "utf8"));
      const current = all.deployments?.[all.current];
      if (current && /^0x[0-9a-fA-F]{40}$/.test(current.address ?? "")) contract = current.address;
    } catch {
      /* keep falling through */
    }
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) {
    throw new Error(
      "Set CONTRACT_ADDRESS (or NEXT_PUBLIC_CONTRACT_ADDRESS) to the deployed contract, " +
        "or keep deploy/deployments.json up to date.",
    );
  }
  const key = env.AGENT_PRIVATE_KEY;
  return {
    contract: contract as `0x${string}`,
    privateKey: key && /^0x[0-9a-fA-F]{64}$/.test(key) ? (key as `0x${string}`) : undefined,
    rpcUrl: env.NEXT_PUBLIC_RPC_URL,
    chainId: env.NEXT_PUBLIC_CHAIN_ID ? Number(env.NEXT_PUBLIC_CHAIN_ID) : undefined,
  };
}
