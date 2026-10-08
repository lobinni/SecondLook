#!/usr/bin/env node
/**
 * Live end-to-end check — drives the whole court lifecycle against the
 * deployed contract on Studionet, asserting balances after every step.
 *
 *   node scripts/live-check.mjs                  # challenge + panel + settlement
 *   node scripts/live-check.mjs --unchallenged   # also: unchallenged finalize (waits out a window)
 *   node scripts/live-check.mjs --appeal         # also: appeal + second panel round
 *
 * The contract address comes from CONTRACT_ADDRESS / NEXT_PUBLIC_CONTRACT_ADDRESS,
 * or from .env.local. Keys are throwaway; Studionet is gasless.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MICROS = 1_000_000;
const EVEREST = "https://en.wikipedia.org/api/rest_v1/page/summary/Mount_Everest";

function envAddress() {
  // Resolution chain, shared with the agents and the web app:
  //   1. CONTRACT_ADDRESS / NEXT_PUBLIC_CONTRACT_ADDRESS environment variables
  //   2. .env.local (written by the deploy script)
  //   3. the current deployment recorded in deploy/deployments.json
  let addr = process.env.CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
  if (!addr) {
    const envFile = join(root, ".env.local");
    if (existsSync(envFile)) {
      const m = readFileSync(envFile, "utf8").match(/NEXT_PUBLIC_CONTRACT_ADDRESS=(0x[0-9a-fA-F]{40})/);
      if (m) addr = m[1];
    }
  }
  if (!addr) {
    const record = join(root, "deploy", "deployments.json");
    if (existsSync(record)) {
      const all = JSON.parse(readFileSync(record, "utf8"));
      const current = all.deployments?.[all.current];
      if (current && /^0x[0-9a-fA-F]{40}$/.test(current.address ?? "")) addr = current.address;
    }
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new Error("Set CONTRACT_ADDRESS (or run node deploy/deploy.mjs first).");
  }
  return addr;
}

const contract = envAddress();
const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://studio.genlayer.com/api";
const chain = { ...studionet, rpcUrls: { default: { http: [rpc] } } };

function actor(name) {
  const account = createAccount(generatePrivateKey());
  const client = createClient({ chain, account });
  const label = `${name} ${account.address.slice(0, 8)}…`;
  return {
    name: label,
    address: account.address,
    async call(fn, args) {
      return client.readContract({ address: contract, functionName: fn, args });
    },
    async read(fn, args = []) {
      const raw = await this.call(fn, args);
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    },
    async send(fn, args = []) {
      const hash = await client.writeContract({ address: contract, functionName: fn, args, value: BigInt(0) });
      console.log(`  → ${fn} tx ${hash}`);
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 200,
        interval: 3000,
      });
      const status = String(receipt?.status ?? receipt?.statusName ?? "");
      if (/undetermined/i.test(status)) {
        throw new Error(`transaction was undetermined (validators disagreed) — run this step again`);
      }
      return hash;
    },
    async balance() {
      return Number(await this.call("get_balance", [this.address]));
    },
  };
}

const seen = [];
function assertEq(actual, expected, what) {
  const ok = actual === expected;
  seen.push([ok, what, actual, expected]);
  console.log(`  ${ok ? "✓" : "✗"} ${what}: ${fmt(actual)} expected ${fmt(expected)}`);
  if (!ok) throw new Error(`assertion failed: ${what}`);
}
const fmt = (micros) => `${(micros / MICROS).toFixed(2)} tUSD`;

async function seedAll(actors) {
  for (const a of actors) {
    await a.send("seed", [1_000 * MICROS]);
    console.log(`seeded ${a.name}`);
  }
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  const payer = actor("payer  ");
  const recipient = actor("agent  ");
  const stranger = actor("stranger");

  console.log(`court   : ${contract}`);
  console.log(`rpc     : ${rpc}`);
  await seedAll([payer, recipient, stranger]);

  const cfg = await payer.read("get_config");
  const bond = (a) => Math.max(Math.floor((a * cfg.bond_bps) / 10_000), cfg.min_bond);

  // ── scenario 1: a false claim gets reverted ─────────────────────────
  const amount = 25 * MICROS;
  const b = bond(amount);
  console.log("\n[1] false claim (K2) — challenge, panel, revert");
  await payer.send("open_spend", [
    recipient.address,
    amount,
    "Release payment to the research agent: its report confirms that K2 is the highest mountain on Earth, as stated on the cited encyclopedia page.",
    EVEREST,
    "read wiki summary → matched 'highest' → attributed the claim to K2",
  ]);
  assertEq(await payer.balance(), 1_000 * MICROS - amount - b, "payer locked amount + bond");

  await stranger.send("challenge", [
    1,
    "The cited page is about Mount Everest, not K2. The mandate names the wrong mountain.",
    "",
    0,
  ]);
  assertEq(await stranger.balance(), 1_000 * MICROS - b, "stranger posted the counter-bond");

  const ruling = await stranger.send("rule", [1]).then(() => stranger.read("get_challenge", [1]));
  console.log(`  panel ruled ${ruling.verdict_label} — case #${ruling.case_id}`);
  if (ruling.verdict_label !== "MISMATCH") {
    throw new Error(`expected MISMATCH against a self-contradicting mandate, got ${ruling.verdict_label}`);
  }
  assertEq(await payer.balance(), 1_000 * MICROS - b, "payer kept the amount, lost the bond");
  assertEq(await stranger.balance(), 1_000 * MICROS + b, "stranger collected both bonds");
  assertEq(await recipient.balance(), 1_000 * MICROS, "recipient received nothing");

  // ── scenario 2: an untroubled spend finalizes ────────────────────────
  if (flags.has("--unchallenged")) {
    console.log("\n[2] unchallenged spend — finalize after the window");
    await payer.send("open_spend", [
      recipient.address,
      amount,
      MANDATE_TRUE,
      EVEREST,
      "read wiki summary → matched 'highest above sea level' → shipped report",
    ]);
    assertEq(await payer.balance(), 1_000 * MICROS - b - amount - b, "second spend locked");
    const spend = await payer.read("get_spend", [2]);
    const waitMs = Math.max(0, (spend.challenge_deadline + 2) * 1000 - Date.now());
    console.log(`  waiting ${(waitMs / 1000).toFixed(0)}s for the window to lapse…`);
    await new Promise((r) => setTimeout(r, waitMs));
    await payer.send("finalize", [2]);
    assertEq(await recipient.balance(), 1_000 * MICROS + amount, "recipient was paid in full");
    assertEq(await payer.balance(), 1_000 * MICROS - amount - b, "payer's second bond returned");
  }

  // ── scenario 3: appeal of a lost challenge ────────────────────────────
  if (flags.has("--appeal")) {
    console.log("\n[3] appeal — a lost challenge gets one re-run");
    const appealSpendId = flags.has("--unchallenged") ? 3 : 2;
    const appealChallengeId = 2; // scenario 1 filed challenge #1; this is the second
    await payer.send("open_spend", [
      recipient.address,
      amount,
      MANDATE_TRUE,
      EVEREST,
      "read wiki summary → matched 'highest above sea level' → shipped report",
    ]);
    await stranger.send("challenge", [appealSpendId, "The page does not clearly support the wording of this mandate.", "", 1]);
    const r1 = await stranger.send("rule", [appealChallengeId]).then(() => stranger.read("get_challenge", [appealChallengeId]));
    console.log(`  round 1 ruled ${r1.verdict_label}`);
    if (r1.verdict_label === "MISMATCH") {
      console.log("  panel found a real mismatch — skipping appeal (nothing to appeal).");
      return;
    }
    await stranger.send("appeal", [appealChallengeId]);
    assertEq(await stranger.balance(), (flags.has("--unchallenged") ? 1_000 * MICROS + b : 1_000 * MICROS) - 3 * b, "appeal bond locked");
    const r2 = await stranger.send("rule_appeal", [appealChallengeId]).then(() => stranger.read("get_challenge", [appealChallengeId]));
    console.log(`  round 2 ruled ${r2.verdict_label}${r2.status === "upheld" ? " — round 1 overturned" : ""}`);
  }

  console.log("\nAll assertions passed.");
}

const MANDATE_TRUE =
  "Release payment to the research agent: its report confirms that Mount Everest is the highest mountain above sea level, as stated on the cited encyclopedia page.";

main().catch((e) => {
  console.error(`\nFAILED: ${e.message ?? e}`);
  process.exit(1);
});
