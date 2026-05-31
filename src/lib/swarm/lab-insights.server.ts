import { classifyCase, type CaseDomain } from "./case-knowledge.server";
import type { RiskAssessment, StrategyOutput, StructuredCase } from "./types";

export interface EvidenceGap {
  item: string;
  impact: string;
  priority: "high" | "medium" | "low";
  haveIt: boolean;
}

export interface RedTeamPoint {
  theirArgument: string;
  yourResponse: string;
}

export interface ScenarioWhatIf {
  label: string;
  question: string;
  ifYes: string;
  signalShift: "stronger" | "weaker" | "neutral";
}

export interface LabInsights {
  liabilitySignal: "strong" | "mixed" | "weak";
  liabilityLabel: string;
  liabilityReasoning: string;
  situationSummary: string;
  evidenceGaps: EvidenceGap[];
  redTeam: RedTeamPoint[];
  scenarios: ScenarioWhatIf[];
  openQuestions: string[];
}

function have(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function buildLabInsights(
  situation: string,
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  caseType?: string,
): LabInsights {
  const domain = classifyCase(situation, caseType).domain;
  const t = situation.toLowerCase();
  const win = risk.winProbability;

  const liabilitySignal: LabInsights["liabilitySignal"] =
    win >= 70 ? "strong" : win >= 50 ? "mixed" : "weak";

  const liabilityLabel =
    liabilitySignal === "strong"
      ? "Liability signals look strong"
      : liabilitySignal === "mixed"
        ? "Liability is plausible but disputed"
        : "Liability is uncertain — more facts needed";

  const situationSummary =
    structured.keyFacts.slice(0, 3).join(" ") ||
    structured.summary.slice(0, 280);

  const evidenceGaps = evidenceGapsFor(domain, t);
  const redTeam = redTeamFor(domain, t, risk);
  const scenarios = scenariosFor(domain, t);
  const openQuestions = openQuestionsFor(domain, structured, strategy);

  return {
    liabilitySignal,
    liabilityLabel,
    liabilityReasoning: `${liabilityLabel} for a ${structured.disputeType} in ${structured.jurisdiction}. ${strategy.rationale.slice(0, 200)}…`,
    situationSummary,
    evidenceGaps,
    redTeam,
    scenarios,
    openQuestions,
  };
}

function evidenceGapsFor(domain: CaseDomain, t: string): EvidenceGap[] {
  if (domain === "personal_injury_auto") {
    return [
      {
        item: "Police / accident report",
        impact: "Confirms fault, DUI arrest, and official narrative",
        priority: "high",
        haveIt: have(t, /police|report|ticket|citation|arrested/),
      },
      {
        item: "Medical records & bills",
        impact: "Proves injury severity and damages amount",
        priority: "high",
        haveIt: have(t, /hospital|medical|doctor|mri|surgery|bill|injur/),
      },
      {
        item: "Photos / video of scene or injuries",
        impact: "Visual proof for insurer and jury",
        priority: "medium",
        haveIt: have(t, /photo|video|dashcam|camera/),
      },
      {
        item: "Witness contact info",
        impact: "Corroborates how the crash happened",
        priority: "medium",
        haveIt: have(t, /witness|saw|passenger/),
      },
      {
        item: "Insurance info for at-fault driver",
        impact: "Identifies who pays — policy limits matter",
        priority: "high",
        haveIt: have(t, /insurance|policy|claim/),
      },
      {
        item: "Lost wage documentation",
        impact: "Economic damages beyond medical bills",
        priority: "medium",
        haveIt: have(t, /wage|salary|missed work|pay stub/),
      },
    ];
  }

  if (domain === "employment") {
    return [
      {
        item: "Written complaints to HR/management",
        impact: "Proves protected activity before termination",
        priority: "high",
        haveIt: have(t, /email|written|complaint|hr/),
      },
      {
        item: "Termination letter or final pay stub",
        impact: "Establishes timing and adverse action",
        priority: "high",
        haveIt: have(t, /terminated|fired|letter|pay stub/),
      },
      {
        item: "Performance reviews",
        impact: "Employer will use these — you need to see them",
        priority: "medium",
        haveIt: have(t, /review|performance/),
      },
      {
        item: "Witnesses to retaliation timeline",
        priority: "medium",
        impact: "Corroborates your version of events",
        haveIt: have(t, /witness|coworker|colleague/),
      },
    ];
  }

  return [
    {
      item: "Written record of what happened",
      impact: "Transforms he-said-she-said into documented facts",
      priority: "high",
      haveIt: have(t, /email|text|document|contract|written/),
    },
    {
      item: "Timeline with dates",
      impact: "Courts and lawyers think in sequences — dates matter",
      priority: "medium",
      haveIt: t.match(/\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|week|month|year/) !== null,
    },
    {
      item: "Names of other parties involved",
      impact: "Identifies who to sue and who can testify",
      priority: "medium",
      haveIt: have(t, /named|called|company|landlord|employer/),
    },
  ];
}

function redTeamFor(domain: CaseDomain, t: string, risk: RiskAssessment): RedTeamPoint[] {
  if (domain === "personal_injury_auto") {
    return [
      {
        theirArgument:
          "Your injuries aren't as serious as you claim, or they pre-existed the crash.",
        yourResponse:
          "Medical records from immediately after the accident create a clear causation chain. Get imaging and treating physician notes.",
      },
      {
        theirArgument:
          "You were partially at fault — comparative negligence reduces your payout.",
        yourResponse:
          have(t, /drunk|dui|dwi|intoxicat/)
            ? "DUI by the other driver is negligence per se — your comparative fault matters less when they're criminally impaired."
            : "Document the other driver's violations; your own fault only matters if you broke traffic laws too.",
      },
      {
        theirArgument:
          "Policy limits cap recovery — we only owe up to $30K/$60K.",
        yourResponse:
          "Check for umbrella policies, commercial coverage if they were working, and your own UM/UIM coverage.",
      },
    ];
  }

  return [
    {
      theirArgument: risk.risks[0] ?? "Your evidence doesn't meet the legal standard.",
      yourResponse:
        risk.strengths[0] ??
        "Gather documentation that converts your narrative into admissible evidence.",
    },
    {
      theirArgument: "The other side's version of events is equally plausible.",
      yourResponse:
        "Identify objective evidence (documents, third parties, timestamps) that breaks the tie.",
    },
  ];
}

function scenariosFor(domain: CaseDomain, t: string): ScenarioWhatIf[] {
  if (domain === "personal_injury_auto") {
    return [
      {
        label: "Police report confirms DUI",
        question: "What if the official report shows the other driver was arrested for DUI?",
        ifYes: "Liability becomes very hard for them to dispute — focus shifts to damages.",
        signalShift: "stronger",
      },
      {
        label: "Pre-existing injury",
        question: "What if you had a prior injury to the same body part?",
        ifYes: "Insurer will argue aggrava vs. new injury — need doctor to separate causation.",
        signalShift: "weaker",
      },
      {
        label: "No insurance / hit and run",
        question: "What if the driver has no insurance or fled the scene?",
        ifYes: "Your own UM/UIM policy and potential criminal restitution become the main paths.",
        signalShift: "weaker",
      },
    ];
  }

  return [
    {
      label: "Strong documentary proof",
      question: "What if you find written evidence supporting your version?",
      ifYes: "Case moves from he-said-she-said to document-backed — settlement leverage increases.",
      signalShift: "stronger",
    },
    {
      label: "Key witness backs out",
      question: "What if your only witness won't testify?",
      ifYes: "You'll rely more on documents and your own credibility at deposition.",
      signalShift: "weaker",
    },
  ];
}

function openQuestionsFor(
  domain: CaseDomain,
  structured: StructuredCase,
  strategy: StrategyOutput,
): string[] {
  const base = [
    `Is ${strategy.primary} the right first move given what we know?`,
    `What's the statute of limitations in ${structured.jurisdiction}?`,
    `What's the filing deadline in ${structured.jurisdiction}?`,
  ];

  if (domain === "personal_injury_auto") {
    return [
      "What are the at-fault driver's policy limits?",
      "Do I have uninsured/underinsured motorist coverage on my own policy?",
      "Should I give a recorded statement to their insurer?",
      ...base,
    ];
  }

  return base;
}

export function answerFollowUp(
  question: string,
  situation: string,
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  lab: LabInsights,
): string {
  const q = question.toLowerCase();
  const domain = classifyCase(situation).domain;

  if (q.includes("should i talk") || q.includes("insurer") || q.includes("recorded statement")) {
    return "Generally: no recorded statement to the other side's insurer without a lawyer. You can report the claim to your own insurer, but stick to facts — don't speculate on fault or injury extent.";
  }

  if (q.includes("lawyer") || q.includes("attorney") || q.includes("need counsel")) {
    return `For ${structured.disputeType}, your posture is **${lab.liabilitySignal}**. Many people file demand letters themselves first (see Action Pack). If the other side has counsel or damages exceed policy limits, bringing in counsel becomes higher leverage — but you don't need permission to start gathering evidence and sending written demands.`;
  }

  if (q.includes("how much") || q.includes("worth") || q.includes("settlement")) {
    return `Damages depend on medical bills, lost wages, and injury severity — we can't put a dollar figure without those numbers. Estimated litigation cost: ${risk.estimatedCost}. Timeline: ${risk.estimatedTimeline}.`;
  }

  if (q.includes("policy limit") || q.includes("insurance")) {
    if (domain === "personal_injury_auto") {
      return "In California, minimum auto liability is $30K per person / $60K per accident. Many drivers carry more. Send a written request for the dec page. Also pull YOUR um/uim coverage from your own policy declarations.";
    }
    return "Insurance coverage varies by case type. A local attorney can send a coverage discovery letter early.";
  }

  if (q.includes("statute") || q.includes("deadline") || q.includes("how long")) {
    if (domain === "personal_injury_auto") {
      return "California PI claims: generally 2 years from the injury to file suit. Don't wait — evidence disappears and insurers slow-walk claims.";
    }
    return `Deadlines vary by claim type in ${structured.jurisdiction}. This is one of the first things to confirm with counsel.`;
  }

  if (q.includes("dui") || q.includes("drunk")) {
    return "A DUI by the other driver supports negligence per se — meaning the crash itself may establish they broke the law. Get the police report and any criminal case number. That criminal conviction or plea can be powerful in civil court.";
  }

  if (q.includes("what should i do") || q.includes("next step")) {
    const missing = lab.evidenceGaps.filter((g) => !g.haveIt && g.priority === "high");
    const gather = missing.length
      ? `Priority: gather ${missing.map((g) => g.item.toLowerCase()).join(", ")}.`
      : "You've flagged the key evidence — send the demand letter from your Action Pack.";
    return `Recommended path: **${strategy.primary}**. ${gather}`;
  }

  return `Based on your ${structured.disputeType} situation: liability looks **${lab.liabilitySignal}**. ${lab.liabilityReasoning.slice(0, 250)} Ask something specific — insurance, deadlines, evidence, or whether to hire a lawyer.`;
}
