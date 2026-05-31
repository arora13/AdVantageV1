import { classifyCase, type CaseDomain } from "./case-knowledge.server";
import type { LabInsights } from "./lab-insights.server";
import type { RiskAssessment, StrategyOutput, StructuredCase } from "./types";

export interface ActionArtifact {
  id: string;
  title: string;
  description: string;
  content: string;
  kind: "letter" | "checklist" | "script" | "timeline" | "brief";
}

export interface ActionPack {
  headline: string;
  plainEnglish: string;
  takeaways: string[];
  artifacts: ActionArtifact[];
  timeline: { when: string; action: string }[];
}

export function buildActionPack(
  situation: string,
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  lab: LabInsights,
  caseType?: string,
): ActionPack {
  const domain = classifyCase(situation, caseType).domain;
  const missing = lab.evidenceGaps.filter((g) => !g.haveIt);

  const baseTakeaways = [
    `Primary move: ${strategy.recommendation}`,
    `Estimated posture: ${risk.winProbability}% on liability with current facts`,
    missing.length
      ? `Close ${missing.filter((g) => g.priority === "high").length} high-priority evidence gap(s) first`
      : "Core evidence is in place — pressure for settlement or file",
  ];

  if (domain === "personal_injury_auto") {
    return piActionPack(situation, structured, risk, strategy, lab, baseTakeaways);
  }
  if (domain === "employment") {
    return employmentActionPack(structured, risk, strategy, lab, baseTakeaways);
  }
  return genericActionPack(structured, risk, strategy, lab, baseTakeaways);
}

function piActionPack(
  situation: string,
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  lab: LabInsights,
  takeaways: string[],
): ActionPack {
  const dui = /\b(drunk|dui|dwi|intoxicat)\b/i.test(situation);
  const jurisdiction = structured.jurisdiction;

  const demandLetter = `[YOUR NAME]
[YOUR ADDRESS]
[DATE]

VIA CERTIFIED MAIL

[INSURANCE COMPANY / AT-FAULT PARTY]
[ADDRESS]

RE: Claim for injuries arising from motor vehicle collision on [DATE OF INCIDENT]

Dear Claims Adjuster:

I write to formally demand compensation for injuries and damages sustained in a motor vehicle collision caused by your insured${dui ? ", who was arrested for DUI at the scene" : ""}.

FACTS:
${structured.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

LIABILITY:
Your insured breached the duty to operate their vehicle safely. ${dui ? "Negligence per se applies based on the DUI arrest." : "The facts support ordinary negligence."}

DAMAGES (document and attach):
• Medical expenses to date: $[AMOUNT]
• Future medical care (estimated): $[AMOUNT]
• Lost wages: $[AMOUNT]
• Property damage: $[AMOUNT]
• Pain and suffering: $[AMOUNT]

I demand payment of $[TOTAL DEMAND] within 30 days. If I do not receive a good-faith response, I will file suit in ${jurisdiction} without further notice.

Sincerely,
[YOUR SIGNATURE]
[YOUR NAME]`;

  const checklist = lab.evidenceGaps
    .map((g) => `[${g.haveIt ? "x" : " "}] ${g.item} — ${g.impact}`)
    .join("\n");

  const insurerScript = `WHEN THE OTHER SIDE'S INSURER CALLS:

SAY:
• "I'm not giving a recorded statement today."
• "Please send your request in writing."
• "My claim number is [if you have one]."

DO NOT SAY:
• Don't admit fault or apologize
• Don't guess at injury severity ("I'm fine")
• Don't accept a settlement number on the phone
• Don't sign anything they email without reading it

YOUR OWN INSURER (if filing UM/UIM):
• Report the accident promptly
• Stick to facts: date, location, police report number
• Ask for your policy limits in writing`;

  return {
    headline: dui
      ? "DUI collision — demand package ready"
      : "Personal injury — demand package ready",
    plainEnglish: `You have a ${risk.winProbability}% liability posture. ${strategy.rationale.split(".")[0]}. Below are ready-to-use documents: a demand letter draft, evidence checklist, and insurer scripts. Fill in the bracketed fields and send.`,
    takeaways,
    timeline: [
      { when: "Today", action: "Request police report and preserve all medical bills" },
      { when: "Day 1–3", action: "Send preservation letter to at-fault insurer (keep proof of mailing)" },
      { when: "Day 7", action: "Complete evidence checklist — photos, wage loss, repair estimates" },
      { when: "Day 14", action: "Send demand letter with documented damages total" },
      { when: "Day 30", action: "If no adequate response, file suit before statute runs (typically 2 years in CA)" },
    ],
    artifacts: [
      {
        id: "demand-letter",
        title: "Demand letter draft",
        description: "Pre-litigation demand — fill brackets and send certified mail",
        kind: "letter",
        content: demandLetter,
      },
      {
        id: "evidence-checklist",
        title: "Evidence checklist",
        description: "Track what you have vs. what you still need",
        kind: "checklist",
        content: checklist,
      },
      {
        id: "insurer-script",
        title: "Insurer call script",
        description: "What to say and avoid when adjusters call",
        kind: "script",
        content: insurerScript,
      },
      {
        id: "case-brief",
        title: "One-page case brief",
        description: "Facts, law, and strategy at a glance",
        kind: "brief",
        content: `CASE BRIEF — ${structured.disputeType}
Jurisdiction: ${jurisdiction}
Posture: ${risk.winProbability}% plaintiff-favorable

FACTS:
${structured.summary.slice(0, 500)}

STRENGTHS:
${risk.strengths.map((s) => `• ${s}`).join("\n")}

RISKS:
${risk.risks.map((s) => `• ${s}`).join("\n")}

RECOMMENDED PATH: ${strategy.recommendation}
${strategy.rationale.slice(0, 400)}`,
      },
    ],
  };
}

function employmentActionPack(
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  lab: LabInsights,
  takeaways: string[],
): ActionPack {
  const demandLetter = `[YOUR NAME]
[DATE]

[EMPLOYER NAME] — Human Resources / Legal
[ADDRESS]

RE: Wrongful termination / retaliation — demand for resolution

Dear [HR CONTACT / GENERAL COUNSEL]:

I was terminated on [DATE], shortly after [protected activity: internal disclosures / complaints]. This letter puts you on notice of my claims under applicable whistleblower and anti-retaliation statutes in ${structured.jurisdiction}.

FACTS:
${structured.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

DAMAGES:
• Lost wages and benefits from [DATE] to present: $[AMOUNT]
• Emotional distress: $[AMOUNT]
• Statutory penalties and fees where applicable

I demand reinstatement or severance of $[AMOUNT] and a neutral employment reference within 21 days. Absent resolution, I will file with the relevant agency and pursue all available remedies.

Sincerely,
[YOUR NAME]`;

  return {
    headline: "Employment retaliation — action package ready",
    plainEnglish: `Posture: ${risk.winProbability}%. ${strategy.recommendation} is the highest-EV path. Use the demand letter, evidence checklist, and agency filing timeline below.`,
    takeaways,
    timeline: [
      { when: "Today", action: "Export all emails, Slack/Teams messages, and HR tickets" },
      { when: "Day 1–5", action: "Request personnel file and termination documents in writing" },
      { when: "Day 7", action: "Contact witnesses — written statements while memory is fresh" },
      { when: "Day 14", action: "Send demand letter to employer" },
      { when: "Day 30–90", action: "File DFEH/EEOC if no resolution (check exact deadline for your claim type)" },
    ],
    artifacts: [
      {
        id: "demand-letter",
        title: "Employer demand letter",
        description: "Pre-litigation demand to HR or company counsel",
        kind: "letter",
        content: demandLetter,
      },
      {
        id: "evidence-checklist",
        title: "Evidence checklist",
        description: "Documents to gather before filing",
        kind: "checklist",
        content: lab.evidenceGaps
          .map((g) => `[${g.haveIt ? "x" : " "}] ${g.item} — ${g.impact}`)
          .join("\n"),
      },
      {
        id: "agency-brief",
        title: "Agency filing brief",
        description: "What to include in DFEH/EEOC intake",
        kind: "brief",
        content: `FILING CHECKLIST — ${structured.disputeType}

Include:
• Chronology of protected activity → adverse action (termination date)
• Names of decision-makers and witnesses
• Copies of written complaints (not just summaries)
• Performance reviews for 12 months before termination
• Comparator info: others who did similar conduct but weren't fired

Key dates to verify for ${structured.jurisdiction}:
• Administrative filing deadline (often 180 days–3 years depending on claim)
• Statute of limitations for court filing after right-to-sue letter`,
      },
    ],
  };
}

function genericActionPack(
  structured: StructuredCase,
  risk: RiskAssessment,
  strategy: StrategyOutput,
  lab: LabInsights,
  takeaways: string[],
): ActionPack {
  return {
    headline: `${structured.disputeType} — action package ready`,
    plainEnglish: `${risk.winProbability}% posture. Execute the timeline below and use the drafts as starting points.`,
    takeaways,
    timeline: [
      { when: "Today", action: "Document everything in writing — dates, names, amounts" },
      { when: "Week 1", action: "Complete evidence checklist" },
      { when: "Week 2", action: `Execute: ${strategy.recommendation}` },
      { when: "Week 4", action: "Reassess posture after new evidence or response from other side" },
    ],
    artifacts: [
      {
        id: "case-brief",
        title: "Case brief",
        description: "Facts, risks, and recommended path",
        kind: "brief",
        content: `${structured.disputeType} — ${structured.jurisdiction}

${structured.summary}

Recommendation: ${strategy.recommendation}
${strategy.rationale}`,
      },
      {
        id: "evidence-checklist",
        title: "Evidence checklist",
        description: "What strengthens your position",
        kind: "checklist",
        content: lab.evidenceGaps
          .map((g) => `[${g.haveIt ? "x" : " "}] ${g.item} — ${g.impact}`)
          .join("\n"),
      },
    ],
  };
}
