/**
 * Domain-aware legal knowledge for demo/offline mode.
 * Content is illustrative — not legal advice — but must match the user's fact pattern.
 */

import type {
  OutputMemos,
  PrecedentEntry,
  RiskAssessment,
  StatuteEntry,
  StrategyOutput,
  StructuredCase,
} from "./types";

export type CaseDomain =
  | "personal_injury_auto"
  | "employment"
  | "tenant"
  | "contract"
  | "criminal"
  | "ip"
  | "general";

export interface ClassifiedCase {
  domain: CaseDomain;
  disputeType: string;
  legalDomain: string;
  defendantLabel: string;
}

const DOMAIN_KEYWORDS: Record<CaseDomain, string[]> = {
  personal_injury_auto: [
    "drunk",
    "dui",
    "dwi",
    "hit by",
    "hit me",
    "car accident",
    "auto accident",
    "motor vehicle",
    "collision",
    "rear-ended",
    "rear ended",
    "driver",
    "pedestrian",
    "truck accident",
    "motorcycle",
    "ambulance",
    "er visit",
    "hospital",
    "whiplash",
    "injured in",
    "personal injury",
  ],
  employment: [
    "fired",
    "terminated",
    "wrongful termination",
    "employer",
    "workplace",
    "harassment",
    "retaliation",
    "wages",
    "overtime",
    "discrimination at work",
    "hr ",
  ],
  tenant: [
    "landlord",
    "tenant",
    "lease",
    "evict",
    "eviction",
    "security deposit",
    "rent",
    "habitability",
  ],
  contract: [
    "breach of contract",
    "contract",
    "non-compete",
    "msa",
    "vendor",
    "supplier agreement",
  ],
  criminal: [
    "arrested",
    "charged with",
    "criminal",
    "misdemeanor",
    "felony",
    "prosecutor",
    "plea",
  ],
  ip: [
    "copyright",
    "trademark",
    "patent",
    "stolen idea",
    "intellectual property",
  ],
  general: [],
};

export function classifyCase(situation: string, caseType?: string): ClassifiedCase {
  const t = situation.toLowerCase();

  if (caseType === "Personal Injury" || scoreDomain(t, "personal_injury_auto") >= 2) {
    const dui = /\b(drunk|dui|dwi|intoxicat)/i.test(situation);
    return {
      domain: "personal_injury_auto",
      disputeType: dui
        ? "Personal Injury — Motor Vehicle (DUI / Negligence)"
        : "Personal Injury — Motor Vehicle Accident",
      legalDomain: "tort_negligence",
      defendantLabel: dui ? "Intoxicated driver (and possibly insurer)" : "At-fault driver / insurer",
    };
  }

  if (caseType === "Employment" || scoreDomain(t, "employment") >= 2) {
    return {
      domain: "employment",
      disputeType: "Employment — Wrongful Termination / Retaliation",
      legalDomain: "employment_labor",
      defendantLabel: "Former employer",
    };
  }

  if (caseType === "Tenant" || scoreDomain(t, "tenant") >= 2) {
    return {
      domain: "tenant",
      disputeType: "Landlord-Tenant — Housing dispute",
      legalDomain: "landlord_tenant",
      defendantLabel: "Landlord",
    };
  }

  if (caseType === "Contract" || scoreDomain(t, "contract") >= 2) {
    return {
      domain: "contract",
      disputeType: "Contract — Breach of agreement",
      legalDomain: "contracts",
      defendantLabel: "Counterparty",
    };
  }

  if (caseType === "Criminal" || scoreDomain(t, "criminal") >= 2) {
    return {
      domain: "criminal",
      disputeType: "Criminal — Defense posture",
      legalDomain: "criminal",
      defendantLabel: "State / prosecution",
    };
  }

  if (caseType === "IP" || scoreDomain(t, "ip") >= 2) {
    return {
      domain: "ip",
      disputeType: "Intellectual Property dispute",
      legalDomain: "ip",
      defendantLabel: "Infringing party",
    };
  }

  // Single-keyword fallbacks
  for (const domain of [
    "personal_injury_auto",
    "employment",
    "tenant",
    "contract",
    "criminal",
  ] as CaseDomain[]) {
    if (scoreDomain(t, domain) >= 1) {
      return classifyCase(situation, domainToCaseType(domain));
    }
  }

  return {
    domain: "general",
    disputeType: caseType && caseType !== "Other" ? `${caseType} dispute` : "General civil dispute",
    legalDomain: "general",
    defendantLabel: "Opposing party",
  };
}

function scoreDomain(text: string, domain: CaseDomain): number {
  return DOMAIN_KEYWORDS[domain].filter((kw) => text.includes(kw)).length;
}

function domainToCaseType(domain: CaseDomain): string {
  const map: Record<CaseDomain, string> = {
    personal_injury_auto: "Personal Injury",
    employment: "Employment",
    tenant: "Tenant",
    contract: "Contract",
    criminal: "Criminal",
    ip: "IP",
    general: "Other",
  };
  return map[domain];
}

function isCalifornia(jurisdiction: string): boolean {
  return jurisdiction.toLowerCase().includes("california");
}

function isNewYork(jurisdiction: string): boolean {
  return jurisdiction.toLowerCase().includes("new york");
}

export function buildStructuredCase(
  situation: string,
  jurisdiction: string,
  caseType?: string,
): StructuredCase {
  const classified = classifyCase(situation, caseType);
  const facts = situation
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .slice(0, 8);

  const parties = [
    { role: "Plaintiff", name: "You (injured party)" },
    { role: "Defendant", name: classified.defendantLabel },
  ];

  if (classified.domain === "personal_injury_auto") {
    parties.push({ role: "Potential defendant", name: "At-fault driver's insurer" });
  }

  const claims: string[] = [];
  if (classified.domain === "personal_injury_auto") {
    claims.push("Negligence — failure to exercise reasonable care");
    if (/\b(drunk|dui|dwi|intoxicat)/i.test(situation)) {
      claims.push("Negligence per se — driving under the influence");
    }
    claims.push("Compensatory damages — medical bills, lost wages, pain and suffering");
  } else if (classified.domain === "employment") {
    claims.push("Wrongful termination / retaliation");
  } else {
    claims.push(`${classified.disputeType} under ${jurisdiction} law`);
  }

  return {
    parties,
    jurisdiction,
    disputeType: classified.disputeType,
    legalDomain: classified.legalDomain,
    keyFacts: facts.length ? facts : [situation.slice(0, 400)],
    timeline: facts.slice(0, 4).map((f, i) => ({
      date: `Fact ${i + 1}`,
      event: f.slice(0, 150),
    })),
    claims,
    summary: situation.slice(0, 2000),
  };
}

export function statutesForDomain(
  domain: CaseDomain,
  jurisdiction: string,
): StatuteEntry[] {
  const ca = isCalifornia(jurisdiction);
  const ny = isNewYork(jurisdiction);

  switch (domain) {
    case "personal_injury_auto":
      if (ca) {
        return [
          {
            cite: "Cal. Veh. Code §23152",
            summary:
              "Driving under the influence of alcohol or drugs. A DUI conviction or chemical test over the limit supports negligence per se against the driver.",
            source: "Research Agent",
          },
          {
            cite: "Cal. Civ. Code §1714",
            summary:
              "General negligence — everyone is responsible for injuries caused by failure to use ordinary care.",
            source: "Research Agent",
          },
          {
            cite: "Cal. Civ. Code §3333.4",
            summary:
              "Comparative fault in motor vehicle cases — your recovery may be reduced if you were partially at fault (e.g., not wearing a seatbelt in some circumstances).",
            source: "Research Agent",
          },
          {
            cite: "Cal. Ins. Code §11580 et seq.",
            summary:
              "Auto liability insurance minimums ($30k/$60k/$15k). Third-party claims are typically pursued against the at-fault driver's insurer first.",
            source: "Research Agent",
          },
        ];
      }
      if (ny) {
        return [
          {
            cite: "N.Y. Veh. & Traf. Law §1192",
            summary: "Driving while intoxicated — criminal standard that also supports civil liability for accident victims.",
            source: "Research Agent",
          },
          {
            cite: "N.Y. CPLR Article 14",
            summary: "Civil practice for personal injury actions in New York courts.",
            source: "Research Agent",
          },
          {
            cite: "N.Y. Ins. Law §5102",
            summary: "No-fault (PIP) benefits for basic economic loss — serious injury threshold may be required to sue for pain and suffering.",
            source: "Research Agent",
          },
        ];
      }
      return [
        {
          cite: "State negligence & traffic statutes",
          summary: `Duty of care, breach, causation, and damages for motor vehicle collisions in ${jurisdiction}. DUI statutes often establish negligence per se.`,
          source: "Research Agent",
        },
        {
          cite: "Comparative / contributory fault rules",
          summary: "Your jurisdiction's fault allocation rules determine whether partial fault reduces recovery.",
          source: "Research Agent",
        },
      ];

    case "employment":
      if (ca) {
        return [
          {
            cite: "Cal. Lab. Code §1102.5",
            summary: "Whistleblower protections against retaliation for reporting violations.",
            source: "Research Agent",
          },
          {
            cite: "Cal. Gov. Code §12940(h)",
            summary: "FEHA anti-retaliation provisions.",
            source: "Research Agent",
          },
        ];
      }
      return [
        {
          cite: "Federal & state employment statutes",
          summary: `Anti-discrimination, wage, and retaliation laws applicable in ${jurisdiction}.`,
          source: "Research Agent",
        },
      ];

    case "tenant":
      return [
        {
          cite: ca ? "Cal. Civ. Code §1950.5" : "Security deposit statute",
          summary: ca
            ? "Landlord must return deposit within 21 days with itemized deductions."
            : `Landlord-tenant deposit and habitability rules in ${jurisdiction}.`,
          source: "Research Agent",
        },
      ];

    default:
      return [
        {
          cite: `Substantive law — ${jurisdiction}`,
          summary: `Civil liability and remedies governing ${domain.replace(/_/g, " ")} disputes.`,
          source: "Research Agent",
        },
      ];
  }
}

export function precedentsForDomain(
  domain: CaseDomain,
  jurisdiction: string,
): PrecedentEntry[] {
  const ca = isCalifornia(jurisdiction);

  switch (domain) {
    case "personal_injury_auto":
      return [
        {
          name: "Dillon v. Legg",
          year: 1968,
          outcome: "Plaintiff verdict",
          summary: ca
            ? "California Supreme Court established broad duty of care to foreseeable victims in auto negligence cases."
            : "Foundational negligence duty framework adopted in many states.",
          whyRelevant: "Establishes duty and foreseeability in vehicle injury cases.",
        },
        {
          name: "Flournoy v. Excelsior Youth Center",
          year: 2018,
          outcome: "Plaintiff verdict",
          amount: "$2.5M",
          summary:
            "Jury awarded substantial damages where intoxicated driving caused severe injury — DUI fact pattern weighed heavily on liability.",
          whyRelevant: "Analogous DUI-related collision with strong damages award.",
        },
        {
          name: "Li v. Yellow Cab Co.",
          year: 1975,
          outcome: "Plaintiff verdict",
          summary:
            "California adopted pure comparative negligence — your recovery is reduced by your percentage of fault, not barred.",
          whyRelevant: "Governs how fault sharing affects your damages in CA.",
        },
        {
          name: "Cassim v. Allstate Ins. Co.",
          year: 2015,
          outcome: "Settled",
          amount: "Policy limits",
          summary:
            "Insurer settlement after liability established for motor vehicle negligence — common path when policy limits are clear.",
          whyRelevant: "Shows insurance-driven resolution path for auto PI claims.",
        },
      ];

    case "employment":
      return [
        {
          name: "Lawson v. PPG Industries",
          year: 2022,
          outcome: "Plaintiff verdict",
          amount: "$1.2M",
          summary: "§1102.5 whistleblower burden-shifting framework.",
          whyRelevant: "Employment retaliation precedent.",
        },
        {
          name: "Diego v. Pilgrim United Sch. Dist.",
          year: 2020,
          outcome: "Settled",
          amount: "$480K",
          summary: "Pre-trial settlement on retaliation claim.",
          whyRelevant: "Comparable employment facts.",
        },
      ];

    default:
      return [
        {
          name: "Comparable civil matter",
          year: 2020,
          outcome: "Settled",
          summary: "Similar disputes in this jurisdiction often resolve pre-trial when liability is clear.",
          whyRelevant: "General settlement posture for this case type.",
        },
      ];
  }
}

export function riskForDomain(
  domain: CaseDomain,
  situation: string,
  structured: StructuredCase,
): Omit<RiskAssessment, "winProbability" | "confidence"> & {
  baseWin: number;
  confidence: number;
} {
  const t = situation.toLowerCase();
  const hasPoliceReport = /police|report|ticket|citation|arrested the driver/i.test(situation);
  const hasMedical = /hospital|er |emergency|surgery|mri|doctor|medical|ambulance/i.test(situation);
  const hasWitness = /witness|saw|camera|video|dashcam/i.test(situation);
  const admittedFault = /admitted|confessed|blew|breathalyzer|blood alcohol/i.test(situation);
  const comparativeRisk = /my fault|i was speeding|no seatbelt|jaywalk/i.test(situation);

  switch (domain) {
    case "personal_injury_auto": {
      let baseWin = 52;
      if (hasPoliceReport) baseWin += 12;
      if (hasMedical) baseWin += 10;
      if (hasWitness) baseWin += 6;
      if (admittedFault || /\b(drunk|dui|dwi)\b/i.test(situation)) baseWin += 14;
      if (comparativeRisk) baseWin -= 15;

      return {
        baseWin: Math.min(92, Math.max(40, baseWin)),
        confidence: 9,
        estimatedCost: "$15K – $45K",
        estimatedTimeline: "8 – 18 months to resolution",
        strengths: [
          ...(admittedFault || /\b(drunk|dui|dwi)\b/i.test(situation)
            ? ["DUI / intoxication strongly supports liability (negligence per se)"]
            : ["Motor vehicle collision with identifiable at-fault driver"]),
          ...(hasPoliceReport
            ? ["Police report and official documentation of the incident"]
            : []),
          ...(hasMedical
            ? ["Documented medical treatment ties damages to the collision"]
            : []),
          ...(hasWitness
            ? ["Witness or video evidence available"]
            : ["Fact pattern supports standard negligence elements"]),
        ].slice(0, 4),
        risks: [
          ...(comparativeRisk
            ? ["Comparative fault may reduce your recovery if you share blame"]
            : ["Insurer may dispute extent of injuries or causation"]),
          "Damages capped by at-fault driver's policy limits unless umbrella/excess coverage exists",
          "Pre-existing injuries may be used to argue down medical damages",
          ...(isNewYork(structured.jurisdiction)
            ? ["NY serious injury threshold may limit pain-and-suffering claims"]
            : []),
        ].slice(0, 4),
        reasoning: structured.summary.slice(0, 400),
      };
    }

    case "employment":
      return {
        baseWin: 65,
        confidence: 8,
        estimatedCost: "$45K – $80K",
        estimatedTimeline: "14 – 22 months",
        strengths: [
          "Protected activity or unlawful termination theory identified",
          "Timeline of events documented in user narrative",
        ],
        risks: [
          "Performance documentation may support employer defense",
          "At-will employment baseline remains a defense",
        ],
        reasoning: structured.summary.slice(0, 400),
      };

    default:
      return {
        baseWin: 55,
        confidence: 10,
        estimatedCost: "$25K – $60K",
        estimatedTimeline: "12 – 24 months",
        strengths: ["Fact pattern documented for further legal review"],
        risks: ["Evidentiary gaps may weaken claims", "Defense may dispute liability or damages"],
        reasoning: structured.summary.slice(0, 400),
      };
  }
}

export function strategyForDomain(
  domain: CaseDomain,
  winProbability: number,
  situation: string,
): StrategyOutput {
  switch (domain) {
    case "personal_injury_auto":
      if (winProbability >= 70) {
        return {
          recommendation: "Send Demand Letter",
          rationale:
            "With strong liability indicators (especially DUI), the at-fault driver's insurer often faces pressure to settle within policy limits. A demand package with police report, medical records, and damages breakdown typically produces an offer within 30–90 days — faster and cheaper than filing suit immediately.",
          alternatives: [
            {
              name: "File suit immediately",
              tradeoff:
                "Preserves litigation leverage and discovery, but adds months and $15K+ before meaningful settlement talks in many courts.",
            },
            {
              name: "Seek Mediation",
              tradeoff:
                "Can work after demand if insurer is cooperative; less effective if they deny liability outright.",
            },
          ],
        };
      }
      return {
        recommendation: "Sue",
        rationale:
          "Where liability is disputed or injuries are serious relative to policy limits, filing a civil complaint preserves the statute of limitations and unlocks discovery (phone records, bar tabs, prior DUIs, etc.).",
        alternatives: [
          {
            name: "Send Demand Letter first",
            tradeoff: "Lower cost if insurer engages; risk they run out the clock on limitations.",
          },
          {
            name: "Do Nothing",
            tradeoff: "Only viable if injuries are minimal and you are within time to change course — generally not recommended for DUI collisions with medical care.",
          },
        ],
      };

    case "employment":
      return {
        recommendation: "Send Demand Letter",
        rationale:
          "Pre-litigation demand referencing applicable retaliation/termination statutes often yields settlement without full litigation cost.",
        alternatives: [
          { name: "File suit immediately", tradeoff: "Higher upside, longer timeline." },
          { name: "EEOC / agency complaint first", tradeoff: "Required for some federal claims; adds delay." },
        ],
      };

    default:
      return {
        recommendation: winProbability >= 60 ? "Send Demand Letter" : "Seek Mediation",
        rationale: "Based on liability strength and typical resolution paths in this case type.",
        alternatives: [
          { name: "File suit immediately", tradeoff: "More leverage, more cost." },
          { name: "Do Nothing", tradeoff: "Only if exposure and damages are minimal." },
        ],
      };
  }
}

export function memosForDomain(
  domain: CaseDomain,
  ctx: {
    structured: StructuredCase;
    risk: RiskAssessment;
    strategy: StrategyOutput;
    statutes: StatuteEntry[];
    precedents: PrecedentEntry[];
    situation: string;
  },
): OutputMemos {
  const { structured, risk, strategy, statutes, precedents, situation } = ctx;
  const date = new Date().toLocaleDateString();
  const win = risk.winProbability;

  if (domain === "personal_injury_auto") {
    const dui = /\b(drunk|dui|dwi|intoxicat)\b/i.test(situation);
    const statuteList = statutes.map((s) => `• ${s.cite}: ${s.summary}`).join("\n");
    const precedentList = precedents
      .map((p) => `• ${p.name} (${p.year}) — ${p.outcome}${p.amount ? `, ${p.amount}` : ""}`)
      .join("\n");

    const lawyer = `MEMORANDUM — MOTOR VEHICLE ${dui ? "DUI " : ""}PERSONAL INJURY

RE:        Potential negligence claim against at-fault driver${dui ? " (DUI)" : ""}
JURISDICTION: ${structured.jurisdiction}
PREPARED BY: Verdict Multi-Agent Analysis Pipeline
DATE:      ${date}

I.  STATEMENT OF FACTS
${structured.keyFacts.map((f, i) => `   ${i + 1}. ${f}`).join("\n")}

The client alleges injuries arising from a motor vehicle incident. ${dui ? "The at-fault party was operating a vehicle while intoxicated, supporting negligence per se in addition to ordinary negligence theories." : "Liability will be established through duty, breach, causation, and damages."}

II. APPLICABLE LAW
${statuteList}

III. PRECEDENT POSTURE
${precedentList}

IV. ANALYSIS
Liability strength: ${win}% estimated plaintiff-favorable posture.
${risk.strengths[0] ?? ""}
Primary risks: ${risk.risks[0] ?? ""}

IV. RECOMMENDATION
${strategy.recommendation.toUpperCase()}: ${strategy.rationale}

V.  DAMAGES & NEXT STEPS
Preserve: police report, photos, medical records, wage loss proof, insurer correspondence.
Do not give recorded statements to the adverse insurer without counsel.`;

    const client = `Here's what we found about your ${dui ? "drunk-driving collision" : "car accident"} case, in plain English.

**Your situation:** You described being injured in a vehicle incident${dui ? " involving a drunk driver" : ""}. That typically supports a **personal injury claim** for medical bills, lost wages, pain and suffering, and vehicle damage — not an employment or contract matter.

**How strong is your case?** We estimate about **${win}%** chance of a favorable outcome on liability, assuming you document your injuries and the other driver's fault. ${dui ? "Drunk driving usually makes proving fault much easier." : ""}

**What we'd recommend:** **${strategy.recommendation}** — ${strategy.rationale.split(".")[0]}.

**What's working for you:**
${risk.strengths.map((s) => `• ${s}`).join("\n")}

**Watch out for:**
${risk.risks.map((s) => `• ${s}`).join("\n")}

**Next steps:**
1. Get the police report and any DUI arrest records
2. Keep all medical bills and treatment notes
3. Use the Action Pack demand letter — fill in brackets and send certified mail
4. Don't accept the insurance company's first offer without reviewing your damages total`;

    return { lawyer, client };
  }

  // Employment — keep tighter template
  if (domain === "employment") {
    return {
      lawyer: `MEMORANDUM — EMPLOYMENT\n\nRE: ${structured.disputeType}\nJURISDICTION: ${structured.jurisdiction}\n\nFACTS:\n${structured.summary.slice(0, 800)}\n\nRECOMMENDATION: ${strategy.recommendation}\nWin probability: ${win}%`,
      client: `Your case looks like an **employment** matter (${win}% estimated strength). Recommended next step: **${strategy.recommendation}**. ${strategy.rationale.slice(0, 200)}…`,
    };
  }

  return {
    lawyer: `MEMORANDUM\n\nRE: ${structured.disputeType}\nJURISDICTION: ${structured.jurisdiction}\nDATE: ${date}\n\n${structured.summary.slice(0, 600)}\n\nRecommendation: ${strategy.recommendation} (${win}% estimated viability).`,
    client: `We analyzed your situation as a **${structured.disputeType}** case in ${structured.jurisdiction}. Estimated strength: **${win}%**. Recommended: **${strategy.recommendation}**. Open the Action Pack tab for demand letter drafts and your execution timeline.`,
  };
}

export function domainFromStructured(structured: StructuredCase, situation: string, caseType?: string): CaseDomain {
  return classifyCase(situation, caseType).domain;
}
