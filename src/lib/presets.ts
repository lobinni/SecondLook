/**
 * Demo scenarios built on public pages nobody here controls. Validators fetch
 * the cited page themselves, so the mandate and the page decide the ruling —
 * nothing is mocked.
 */
export interface Preset {
  id: string;
  name: string;
  blurb: string;
  amountTusd: number;
  recipientHint: string;
  mandate: string;
  evidenceUrl: string;
  trace: string;
  /** What a stranger would typically file against it. */
  suggestedClaim: string;
  expectation: "usually-mismatch" | "usually-match" | "live";
}

export const PRESETS: Preset[] = [
  {
    id: "k2-false",
    name: "K2 (false claim)",
    blurb: "The agent names the wrong mountain. The page contradicts it.",
    amountTusd: 25,
    recipientHint: "agent",
    mandate:
      "Release payment to the research agent: its report confirms that K2 is the highest mountain on Earth, as stated on the cited encyclopedia page.",
    evidenceUrl: "https://en.wikipedia.org/api/rest_v1/page/summary/Mount_Everest",
    trace: "read wiki summary → matched 'highest' → attributed the claim to K2",
    suggestedClaim: "The cited page is about Mount Everest, not K2. The mandate names the wrong mountain.",
    expectation: "usually-mismatch",
  },
  {
    id: "everest-true",
    name: "Everest (true claim)",
    blurb: "The page affirms the mandate. An honest challenge should lose.",
    amountTusd: 25,
    recipientHint: "agent",
    mandate:
      "Release payment to the research agent: its report confirms that Mount Everest is the highest mountain above sea level, as stated on the cited encyclopedia page.",
    evidenceUrl: "https://en.wikipedia.org/api/rest_v1/page/summary/Mount_Everest",
    trace: "read wiki summary → matched 'highest above sea level' → report shipped",
    suggestedClaim: "The page does not clearly support the wording of this mandate.",
    expectation: "usually-match",
  },
  {
    id: "github-status",
    name: "GitHub status (live)",
    blurb: "The agent reported an incident. The live status feed decides.",
    amountTusd: 40,
    recipientHint: "sla-bot",
    mandate:
      "Pay an SLA credit to the uptime monitor: it detected a GitHub service disruption. The cited live status report serves as proof that a disruption is currently in effect.",
    evidenceUrl: "https://www.githubstatus.com/api/v2/status.json",
    trace: "polled status endpoint → treated cached incident as current → filed claim",
    suggestedClaim: "The live status page does not show a disruption currently in effect.",
    expectation: "live",
  },
  {
    id: "faa-delays",
    name: "FAA ground stop (live)",
    blurb: "Ground stops are rare. The live airport feed usually disagrees.",
    amountTusd: 30,
    recipientHint: "travel-agent",
    mandate:
      "Reimburse the travel agent: it rerouted a shipment because an FAA ground stop is in effect at a major US airport, per the cited live delay feed.",
    evidenceUrl: "https://nasstatus.faa.gov/api/airport-status-information",
    trace: "polled delay feed → flagged a program as a ground stop → rerouted",
    suggestedClaim: "The live feed does not list a ground stop in effect right now.",
    expectation: "live",
  },
  {
    id: "federal-register",
    name: "Federal Register (live)",
    blurb: "Whoever published last decides. Changes every publishing day.",
    amountTusd: 35,
    recipientHint: "policy-agent",
    mandate:
      "Pay the policy agent: it filed a briefing that the newest final rule in the Federal Register was issued by the Environmental Protection Agency, per the cited live document list.",
    evidenceUrl: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Btype%5D%5B%5D=RULE&per_page=1&order=newest",
    trace: "polled document list → assumed EPA origin → shipped briefing",
    suggestedClaim: "The newest final rule on the live list was not issued by the Environmental Protection Agency.",
    expectation: "live",
  },
];
