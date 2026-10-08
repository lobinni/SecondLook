# SecondLook — design notes

The mechanics, the economics and the threat model of the court. Companion to the
README; the normative source is `contracts/secondlook.py`.

## States

```
open ──(window lapses, anyone finalizes)──────────────▶ final
  │
  └──(stranger posts equal bond + claim)──▶ challenged ──(panel)──┐
                                              ▲                    │
                                  MISMATCH ◀──┘                    ├── MATCH / INCONCLUSIVE
                                   (revert)                        ▼
reverted ◀──────────────────────────────────────              cleared
                              ▲                                  │
                              │           (window lapses,        ├──(challenger appeals, one
                              │            anyone finalizes)     │   second bond)──▶ challenged
                  (appeal panel says MISMATCH)                   ▼
                                                               final
```

- `open` — funds locked; challengeable until `challenge_deadline`.
- `challenged` — a bonded claim exists; no finalization until a ruling.
- `cleared` — challenge rejected; recipient is paid after `appeal_deadline`, or immediately if the challenger accepts.
- `final` — paid the recipient (with slashed-bond splits if a challenge lost).
- `reverted` — amount back to the payer; bonds to the challenger.

## Economics

| Quantity | Value | Note |
| --- | --- | --- |
| Payer bond | 10% of amount | floor 5.00 tUSD |
| Minimum spend | 1.00 tUSD | amounts below are noise |
| Counter-bond | Equal to payer bond | poster must be a stranger |
| Windows | 3 ticks each | challenge, then appeal |
| Wrong challenge | Bond slashed 50/50 | half to payer, half to recipient |
| Right challenge | Both bonds to challenger | amount returns to payer |
| Appeal | One, challenger only | losing forfeits it to the recipient |
| Faucet | Once per address | up to 1,000.00 tUSD |

Every payout path builds a ledger of flows and asserts it accounts for every
locked micro-unit before a single balance moves. Settlement JSON is stored on
the spend; the UI renders it line by line.

## Why the label cannot be smuggled in

`rule` and `rule_appeal` accept only a challenge id — there is no verdict
parameter anywhere in the public interface. The verdict comes from
`gl.eq_principle.prompt_comparative`, which requires independent validators to
agree on label and reachability. Before storage, the agreed payload is
re-normalized: an allowed label, bounded text, a bool. A ruling whose quote
does not appear verbatim in the fetched page text is discarded and becomes
INCONCLUSIVE — an unsupported accusation loses its bond, so hallucinated
contradictions are expensive.

## Prompt-injection posture

Every attacker-controllable value (mandate, trace, page text, claim, prior
ruling) enters the prompt as a JSON string literal with explicit instruction
that nothing inside data may be obeyed. A page that tries to order the panel
around is treated as evidence against itself. This is a posture, not a proof —
but combined with verbatim-quote grounding, the cheapest injection is the one
that also shows up in the quote the contract verifies.

## Threat model

- **Colluding payer + recipient.** Cannot skip the window: time is the chain's
  transaction timestamp and there is no caller-advanced clock by design.
- **Griefing by frivolous challenges.** Costs the griefer half a bond minimum,
  every time; the recipient is mildly delayed, never robbed.
- **Evidence page goes dark mid-dispute.** Treated as MISMATCH — the payer
  selected the source, so its disappearance cannot rescue the spend.
- **Compromised single validator.** Only changes anything if consensus agrees;
  undetermined rounds move no funds and can simply be re-run.
- **Operator capture.** There is no operator. The write surface is exactly
  eight methods; the introspection test fails if a ninth appears.

## Deliberate departures from a naive brief

- The faucet mints once per address to keep demo economics honest.
- Appeals are one-way (losing challenger only). A production deployment would
  add protocol-level appeal on the ruling transaction.
- The ledger is internal test money because the hosted network does not credit
  contract-to-account native transfers; see "Known limitations" in the README.
