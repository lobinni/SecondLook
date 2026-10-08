# SecondLook

**A standing third-party veto on autonomous payments.** An agent releases a payment against a one-line mandate. For a short window, any stranger can post a counter-bond and force a second look; a [GenLayer](https://genlayer.com) validator panel reads the mandate, the agent's trace and the live pages, and agrees on a verdict under the Equivalence Principle. If the challenger is right, the spend reverts and they are paid from the payer's bond. If they are wrong, they lose their bond. If nobody challenges, the payment finalizes.

> The first verdict is trusted only because a stranger can fund a second one for less than the claim.

This is not an escrow between two parties who already agreed to dispute each other. It is a permissionless check that sits on every agent payment. Amounts are test funds (tUSD) held in the court's own ledger on Studionet; nothing is real money, and the [known limitations](#known-limitations) explain why the ledger is internal.

## Why a validator panel

"Does this page support this mandate?" is a judgement about meaning, not a boolean. A deterministic contract cannot read a web page, and an oracle server that does it becomes the operator the design exists to remove. Here the label comes only from independent validators who each fetch the pages themselves, and the contract has **no owner, admin, operator or pause key**. Remove the consensus call and a challenged spend can never settle around a pending challenge, and no challenge can pay out (see [the deletion test](docs/TESTING.md#the-deletion-test)).

## The console

`/` is a public landing page driven by live contract data. `/console` is the product:

| Screen | What it answers |
| --- | --- |
| Overview | How much is under watch, what is at risk, and what to do next. Includes the **Opportunity Radar**. |
| Opportunities / Active disputes / Won / Lost | The same spends, sliced by where they are; searchable, exportable to CSV. |
| Spend detail | Timeline, evidence (expandable, with sources), the panel's analysis, the settlement ledger, and every action. |
| Panel analysis / Risk signals / Evidence | Every ruling; rule-based checks over contract state; every cited page. |
| Transactions / Analytics | Every payout and why; charts that each answer one question. |
| Settings / Activity / Help | Wallet and network, faucet, session transactions, the flow and shortcuts. |

Press **⌘K / Ctrl-K** anywhere to search spends, rulings, pages and actions. On a phone the console becomes a bottom-nav app. Nothing on any screen is mocked: if a number cannot be computed from a spend, a challenge or a ruling, it is not shown (so there is no "recovery confidence" percentage — only the panel's label, reason and verified quote).

## Network

| | |
| --- | --- |
| Network | GenLayer Studionet (hosted development network, gasless) |
| Chain id | **61999** |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com` |
| Contract | `SecondLookCourt` — live at [`0x7557947cAD4785Fd7db9E4ea8A9b930D9e2881a1`](https://explorer-studio.genlayer.com/address/0x7557947cAD4785Fd7db9E4ea8A9b930D9e2881a1) (source: [contracts/secondlook.py](contracts/secondlook.py), record: [DEPLOYMENTS.md](DEPLOYMENTS.md)) |
| Tick | 60 s; challenge and appeal windows are 3 ticks (180 s) each |

Studio rate-limits its RPC at roughly **30 requests per minute per client**. The app reads everything in one multi-read call and polls slowly; if you hit the limit, wait a few seconds.

## Tech stack

- **Contract:** Python Intelligent Contract on GenVM — web fetches, model prompts and consensus-under-equivalence (`contracts/secondlook.py`).
- **Web app:** Next.js (App Router), React 19, TypeScript strict, hand-rolled design tokens (`src/app/globals.css`), Manrope, hand-drawn SVG charts, `genlayer-js`. No backend, **no database**: the browser talks to the contract, and your wallet signs. The only environment the build needs is the optional `NEXT_PUBLIC_*` set; without it the app falls back to the bundled config.
- **Agents:** `agent/` — a small SDK and two example agents that run on the real network.

## How it works

1. **Open.** The payer locks `amount + bond` behind a mandate, a cited evidence URL and the agent's trace. Bond is 10% of the amount, at least 5 tUSD. Nothing reaches the recipient.
2. **Challenge.** Within three ticks, a stranger (never the payer or recipient) posts an equal bond and a claim, optionally a counter-page and a cited case.
3. **Rule.** Anyone convenes the panel. Each validator fetches the pages, asks its model, and consensus must agree on `MATCH`, `MISMATCH` or `INCONCLUSIVE`.
   - `MISMATCH`: spend reverts, payer keeps the amount, the challenger collects both bonds.
   - `MATCH` / `INCONCLUSIVE`: challenger loses the bond (half to payer, half to recipient). The recipient is paid once the appeal window passes, or immediately if the challenger accepts.
4. **Appeal (once, challenger only).** A second bond re-runs the panel with the first ruling as advisory context. Winning reverts the spend and returns every bond; losing forfeits the appeal bond to the recipient.
5. **Finalize.** With no challenge, anyone can release the payment once the window lapses.

Every ruling becomes a numbered **case** that later challengers can cite. Full economics table and threat model: [docs/DESIGN.md](docs/DESIGN.md).

## Run it

You need Node 20+ and Python 3.12+ (only for the contract tests). Studionet is hosted, so there is nothing to install for the chain.

```bash
npm install
node deploy/deploy.mjs --tick-seconds 60   # deploys a fresh court, writes .env.local
npm run dev                                 # http://localhost:3000
```

Regenerate every PNG icon (favicon, PWA tiles, social card) after any brand change:

```bash
node scripts/icons/generate-icons.mjs
```

## Deploy on Vercel

This app is stateless — **no database, no `DATABASE_URL`, no secrets and no build-time environment are required**. The browser talks directly to the court on Studionet.

1. Push the repo to GitHub (next section), then in Vercel: **Add New → Project → Import**.
2. Keep every default: framework preset **Next.js** (auto-detected), root directory = repository root, install `npm install`, build `npm run build`, output `.next`.
3. Environment variables are **optional**. Leave the list empty and the app serves the court from the fallback record (`src/lib/config.ts` + `deploy/deployments.json`); or add any of the `NEXT_PUBLIC_*` keys from [.env.example](.env.example) to point at a different network or contract.
4. Deploy. After a fresh contract deployment later, update the address per [Changing the contract address](#changing-the-contract-address) and redeploy.

## Publish to GitHub

`.env`, `.env.local`, `node_modules` and build output are already git-ignored, so the upload is:

```bash
git init
git add .
git commit -m "SecondLook — a standing veto on autonomous payments"
git branch -M main
git remote add origin https://github.com/<your-account>/secondlook.git
git push -u origin main
```

If the repository already exists locally, skip `init`/`commit` as needed; if the
remote was pre-created with a README, add `--force-with-lease` to the push or
pull-rebase first.

## Bring a wallet (MetaMask on chain 61999)

**Participation requires your own wallet.** Connect MetaMask (or any EIP-1193 wallet) from the top bar or Settings; the app asks the wallet to add/switch to **GenLayer Studionet, chain 61999**, and every transaction is signed inside the wallet — this app never sees a key. Reads stay open to everyone.

Then:

1. **Get test funds** — Settings → "Get test funds" (faucet, once per address).
2. **Open a spend** — press + in the sidebar (or ⌘K → "Open a new spend"), pick a live scenario like **K2 (false claim)**.
3. From a **different address**, open the spend and **challenge it**. Try it as the payer first and watch the contract refuse.
4. **Convene the panel.** Validators fetch the real page themselves and rule — with a quote verified word for word against the page. The spend reverts, the stranger collects both bonds, and case #1 is written.
5. Open **Everest (true claim)** and challenge it anyway, citing case #1. The panel rules MATCH, the stranger's bond is slashed, and the payment finalizes.

## Changing the contract address

One address, one resolution chain, zero scattered edits. The live deployment is recorded in [DEPLOYMENTS.md](DEPLOYMENTS.md) and [deploy/deployments.json](deploy/deployments.json). Resolution order:

- **Web app:** `NEXT_PUBLIC_CONTRACT_ADDRESS` (`.env.local`, written automatically by `node deploy/deploy.mjs`) → `DEFAULT_CONTRACT_ADDRESS` in `src/lib/config.ts`.
- **Scripts and agents:** `CONTRACT_ADDRESS` / `NEXT_PUBLIC_CONTRACT_ADDRESS` → `.env.local` → the current address in `deploy/deployments.json`.

Nothing else hard-codes an address. Restart the app after changing it so the client bundle rebuilds.

## Agents

`agent/` is a small SDK and two example agents that run on the real network.

```bash
export CONTRACT_ADDRESS=0x…           # or NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
npx tsx agent/payer-agent.ts          # uptime-credit bot: stale evidence, opens a spend
npx tsx agent/watchdog.ts -- --once   # stranger: reads pages, challenges contradictions, convenes the panel
```

The watchdog's policy is a function from a spend and its page text to a claim or nothing; write your own for other mandates. See the docstrings at the top of each file.

## Tests

Everything is covered in [docs/TESTING.md](docs/TESTING.md): Direct Mode tests for the contract rules, the live end-to-end script against real validators and real public pages, and the deletion test that proves there is no operator fallback.

```bash
pip install -r requirements-test.txt
pytest tests/direct -v
node scripts/live-check.mjs -- --unchallenged
genvm-lint check contracts/secondlook.py
```

## Real sources, not fixtures

Every demo scenario cites a public page nobody here controls:

| Scenario | Source | What an honest panel says |
| --- | --- | --- |
| GitHub status (live) | `githubstatus.com/api/v2/status.json` | Changes on its own. Usually "All Systems Operational", which makes an agent that claimed a disruption wrong. |
| Federal Register (live) | `federalregister.gov` document list | The agent says the EPA issued the newest rule; whoever published last decides, and it changes every publishing day. |
| FAA delays (live) | FAA airport status feed | The agent says a ground stop is in effect; ground stops are rare, so usually MISMATCH. |
| Everest (true claim) | Wikipedia REST summary of Mount Everest | MATCH: the page affirms the mandate, so a challenge should lose. |
| K2 (false claim) | The same page, a mandate it contradicts | MISMATCH: the page says Everest, so a challenge should win. |

## Known limitations

- **Latency.** A panel round takes 20–60 seconds on Studionet; the UI shows each consensus stage and the transaction link while it waits.
- **Models disagree sometimes.** When validators cannot agree the transaction lands undetermined, nothing moves — just convene the panel again.
- **One-way appeal.** Only a losing challenger can appeal; an upheld ruling is final in-contract.
- **A vanished evidence page counts against the spend.** The payer chose the URL.
- **The ledger is internal.** On this hosted network, native transfers out of a contract do not credit ordinary accounts, so value cannot leave a contract there; balances are the court's own accounting of test funds.
- **Studionet state is not permanent.**

## Roadmap

Protocol-level appeal bonds on rulings; real settlement and cross-chain release; evidence from signed attestations as well as web pages; a public docket of cases with citation counts; richer mandates (multiple pages, structured fields).
