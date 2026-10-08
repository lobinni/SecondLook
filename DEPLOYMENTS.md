# Deployments

The single current court and how to roll to a new one.

## Current

| | |
| --- | --- |
| Contract | `SecondLookCourt` ([contracts/secondlook.py](contracts/secondlook.py)) |
| Address | [`0x7557947cAD4785Fd7db9E4ea8A9b930D9e2881a1`](https://explorer-studio.genlayer.com/address/0x7557947cAD4785Fd7db9E4ea8A9b930D9e2881a1) |
| Network | GenLayer Studionet (hosted, gasless) |
| Chain id | 61999 |
| RPC | `https://studio.genlayer.com/api` |
| Tick | 60 s — challenge and appeal windows are 3 ticks (180 s) each |
| Machine-readable record | [deploy/deployments.json](deploy/deployments.json) |

Every part of the stack resolves the court address from one short chain:

| Consumer | Resolution order |
| --- | --- |
| Web app / console | `NEXT_PUBLIC_CONTRACT_ADDRESS` (`.env.local`) → `DEFAULT_CONTRACT_ADDRESS` in `src/lib/config.ts` |
| Scripts and agents (`scripts/live-check.mjs`, `agent/*`) | `CONTRACT_ADDRESS` / `NEXT_PUBLIC_CONTRACT_ADDRESS` → `.env.local` → this record (`deploy/deployments.json`) |

Nothing else in the codebase hard-codes an address. Restart the app after the
address changes so the client bundle is rebuilt with it.

## Rolling to a new court

```bash
node deploy/deploy.mjs --tick-seconds 60   # deploys + rewrites .env.local
```

Then update both records above (this file and `deploy/deployments.json`) and,
if the env file is absent from some environment, the fallback constant in
`src/lib/config.ts`. Superseded addresses are removed from these files — the
record always reflects only the live deployment.
