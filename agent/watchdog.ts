/**
 * Example watchdog: a stranger with a policy.
 *
 * Polls open spends, fetches each cited page itself, and if the page
 * contradicts the mandate, posts an equal bond, files a claim and convenes
 * the panel. The policy in `decide()` is just a function from (spend, page
 * text) to a claim or nothing — write your own for other mandates.
 *
 *   CONTRACT_ADDRESS=0x… npx tsx agent/watchdog.ts [--once]
 */
import { SecondLook, optionsFromEnv } from "./sdk";

const POLL_MS = 20_000;

/** The stranger's policy: return a claim to challenge, or null to leave it. */
function decide(spend: { mandate: string; trace: string }, pageText: string): string | null {
  const page = pageText.toLowerCase();
  // Naive, on purpose: it flags "outage" mandates when the page itself reads
  // as healthy. A sharper policy would parse the page per mandate type.
  const claimsOutage = /disruption|outage|down/i.test(spend.mandate);
  const pageHealthy = /all systems operational|operational/.test(page) && !/major|partial outage/.test(page);
  if (claimsOutage && pageHealthy) {
    return "The cited live status page reports normal operations, which contradicts the paid disruption claim.";
  }
  return null;
}

async function pageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return (await res.text()).replace(/\s+/g, " ").slice(0, 5_000);
  } catch {
    return null;
  }
}

async function pass(cb: SecondLook): Promise<number> {
  let acted = 0;
  const open = await cb.challengeable();
  for (const s of open) {
    if (s.payer.toLowerCase() === cb.address.toLowerCase()) continue; // a party can never challenge
    if (s.recipient.toLowerCase() === cb.address.toLowerCase()) continue;
    const page = await pageText(s.evidence_url);
    if (page === null) {
      console.log(`spend #${s.id}: cited page unreachable — that alone is challengeable`);
    }
    const claim = page === null
      ? "The evidence page cited for this spend could not be retrieved by an independent reader."
      : decide(s, page);
    if (!claim) continue;
    console.log(`spend #${s.id}: page contradicts the mandate — posting bond…`);
    const { challengeId } = await cb.challenge(s.id, claim);
    console.log(`challenge #${challengeId} filed; convening the panel…`);
    const ruling = await cb.rule(challengeId);
    console.log(`panel ruled:`, JSON.stringify(ruling));
    acted += 1;
  }
  return acted;
}

async function main() {
  const once = process.argv.includes("--once");
  const cb = new SecondLook(optionsFromEnv());
  console.log(`watchdog: ${cb.address}`);
  await cb.seedIfNeeded();
  for (;;) {
    const n = await pass(cb).catch((e) => {
      console.error(e.message ?? e);
      return 0;
    });
    if (once) process.exit(n > 0 ? 0 : 2);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
