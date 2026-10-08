/**
 * Example payer agent: an uptime-credit bot.
 *
 * It reads GitHub's live status page, decides (naively, on stale evidence —
 * a classic agent mistake) that a credit is owed, and opens a spend instead
 * of paying outright. Run it, then run the watchdog, and a real ruling
 * comes back from the validators.
 *
 *   CONTRACT_ADDRESS=0x… npx tsx agent/payer-agent.ts [RECIPIENT]
 */
import { MICROS, SecondLook, optionsFromEnv } from "./sdk";

const STATUS_URL = "https://www.githubstatus.com/api/v2/status.json";

async function main() {
  const cb = new SecondLook(optionsFromEnv());
  const recipient = process.argv[2] ?? cb.address; // demo: pay a second account in real use
  console.log(`payer   : ${cb.address}`);
  console.log(`court   : ${optionsFromEnv().contract}`);

  await cb.seedIfNeeded();

  const body = await fetch(STATUS_URL).then((r) => r.json()).catch(() => null);
  const headline = body?.status?.description ?? "unknown";
  console.log(`live status reads: “${headline}” — the agent still believes an outage is in effect.`);

  const amount = 40 * MICROS;
  const { bond, total } = await cb.cost(amount);
  console.log(`locking ${(total / MICROS).toFixed(2)} tUSD (${(bond / MICROS).toFixed(2)} of it bond)…`);

  const { spendId, hash } = await cb.openSpend({
    recipient,
    amount,
    mandate:
      "Pay an SLA credit to the uptime monitor: it detected a GitHub service disruption. The cited live status report serves as proof that a disruption is currently in effect.",
    evidenceUrl: STATUS_URL,
    trace: "polled status endpoint → treated a cached incident as current → filed claim",
  });
  console.log(`spend #${spendId} opened (${hash})`);
  console.log(`any stranger can challenge it for the next window — run the watchdog next.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
