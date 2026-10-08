# Testing SecondLook

Three layers, in order of realism: unit-level Direct Mode tests for every
deterministic rule, a live end-to-end script against real validators and real
public pages, and the deletion test that proves there is no operator fallback.

## 1. Direct Mode tests

The contract's deterministic rules — bonds, windows, validation, floors, the
write surface — run under `genlayer-test`.

```bash
pip install -r requirements-test.txt
pytest tests/direct -v
```

Covered:

| Test | Rule under test |
| --- | --- |
| faucet mints once per address | second claim always reverts |
| seed cap | amounts above 1,000.00 tUSD rejected |
| amount + bond locked | `open_spend` debits `amount + max(10%, 5.00)` |
| minimum amount | spends below 1.00 tUSD rejected |
| mandate bounds | too-short mandates rejected |
| https-only evidence | `http://` and malformed hosts rejected |
| no self-payment | payer ≠ recipient enforced |
| unfunded opens revert | the debit precedes storage |
| early finalize reverts | an open window cannot settle |
| parties cannot challenge | payer/recipient counter-bonds refused |
| unknown ids revert | spends/challenges/cases are bounds-checked |
| write surface | exactly the eight public writes, no owner knobs |

The non-deterministic step (the panel) needs real validators, which a test
runner does not have — ruling behavior is covered below.

## 2. Live end-to-end script

`scripts/live-check.mjs` drives the whole lifecycle against the deployed
contract: faucet, open, challenge, panel, settlement — asserting every balance
after every step, and requiring that a live Wikipedia-backed true claim
survives a challenge while a false one reverts.

The script resolves the court exactly like the rest of the stack: the
`CONTRACT_ADDRESS` / `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variables,
then the `.env.local` file written by the deploy script. The current live
deployment it runs against is recorded in [../DEPLOYMENTS.md](../DEPLOYMENTS.md).
With no environment variable set it still works, because the fallback constant
in `src/lib/config.ts` mirrors that record. Run from the project root:

```bash
node scripts/live-check.mjs                  # core: challenge + panel + settlement
node scripts/live-check.mjs --unchallenged   # adds the finalize path
node scripts/live-check.mjs --appeal         # adds appeal + second panel round
```

The agents in `agent/` read the same resolution chain, so the two example
commands below need nothing beyond the repository checkout:

```bash
npx tsx agent/payer-agent.ts        # opens a spend from a throwaway key
npx tsx agent/watchdog.ts -- --once # reads pages, challenges contradictions
```

Panel rounds take 20–60 seconds each; the script prints every transaction hash
so you can follow along on the explorer. If validators fail to agree (the
receipt says the transaction is undetermined), nothing has moved — run the
round again.

## 3. The deletion test

Open `contracts/secondlook.py` and remove the consensus call inside
`_deliberate` (the single `prompt_comparative` line). Redeploy and observe:

- `rule` can no longer produce a ruling, so a challenged spend stays
  `challenged` forever;
- `finalize` refuses to pay a challenged spend;
- no challenge can pay out, and no fallback exists to force one.

That is the entire security argument in one edit: delete the panel and the
court seizes, because the panel is the only thing that can move a challenged
dollar. Restore the line before redeploying for real use.

## 4. Frontend checks

```bash
npm exec tsc -- --noEmit     # strict types across app, SDK and agents
npm run build                # production build
node scripts/icons/generate-icons.mjs && git status --porcelain   # icons are reproducible
```

## Conventions

- Amounts in tests are integer micro-units (1,000,000 = 1.00 tUSD), exactly as
  the contract stores them.
- Test keys are throwaway; Studionet is gasless, so no funding is ever needed.
- Live sources are checked against reality: the live script reads the cited
  page itself and only asserts what an honest panel must say about it.
