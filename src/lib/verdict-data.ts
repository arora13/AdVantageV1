export type AgentId = "intake" | "research" | "precedent" | "risk" | "strategy" | "output";

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  streamLines: string[];
}

export const AGENTS: AgentDef[] = [
  {
    id: "intake",
    name: "Intake Agent",
    role: "Parse & classify",
    description: "Extracts parties, jurisdiction, dispute type, and timeline from your input.",
    streamLines: [
      "Parsing free-text input…",
      "Identified parties: Plaintiff (you), Defendant (former employer)",
      "Jurisdiction: California, USA",
      "Dispute class: Employment / wrongful termination",
      "Key facts extracted: 7 events on timeline",
    ],
  },
  {
    id: "research",
    name: "Research Agent",
    role: "Statutes & regulations",
    description: "Queries case law databases for relevant statutes in your jurisdiction.",
    streamLines: [
      "Querying CA Labor Code via Apify…",
      "Retrieved §1102.5 (whistleblower protections)",
      "Retrieved §98.6 (retaliation for protected activity)",
      "Cross-referencing federal Title VII…",
      "Compiled 4 statutes, 11 regulatory citations",
    ],
  },
  {
    id: "precedent",
    name: "Precedent Agent",
    role: "Analogous cases",
    description: "Finds 3–5 real cases with similar fact patterns and their outcomes.",
    streamLines: [
      "Searching analogous fact patterns…",
      "Lawson v. PPG Industries (2022) — plaintiff win, $1.2M",
      "Diego v. Pilgrim United (2020) — settled, $480K",
      "People ex rel. Garcia-Brower (2021) — plaintiff win",
      "Outcome distribution: 72% plaintiff-favorable",
    ],
  },
  {
    id: "risk",
    name: "Risk Agent",
    role: "Probability & cost",
    description: "Calculates win probability, estimated cost, timeline, and risk factors.",
    streamLines: [
      "Weighing precedent outcomes against fact strength…",
      "Win probability: 71% (confidence band ±8%)",
      "Estimated cost to litigate: $45K–$80K",
      "Estimated timeline: 14–22 months to verdict",
      "Top risk: documentary evidence of pretext is thin",
    ],
  },
  {
    id: "strategy",
    name: "Strategy Agent",
    role: "Recommended action",
    description: "Picks the optimal path and lays out 2–3 alternatives with tradeoffs.",
    streamLines: [
      "Modeling EV across 5 strategic paths…",
      "Recommendation: SEND DEMAND LETTER",
      "Rationale: leverage from §1102.5 + settlement-prone defendant",
      "Alt 1: File suit immediately (higher upside, +12mo timeline)",
      "Alt 2: EEOC complaint first (preserves federal claims)",
    ],
  },
  {
    id: "output",
    name: "Output Agent",
    role: "Render memo",
    description: "Assembles the final memo in both lawyer and client formats.",
    streamLines: [
      "Drafting lawyer-mode memo with citations…",
      "Drafting plain-English client summary…",
      "Generating exportable PDF…",
      "Verdict ready.",
    ],
  },
];

export const JURISDICTIONS = [
  "California, USA",
  "New York, USA",
  "Texas, USA",
  "Florida, USA",
  "Illinois, USA",
  "England & Wales, UK",
  "Ontario, Canada",
  "New South Wales, Australia",
  "Federal (US)",
  "Other / International",
];

export interface CaseResult {
  winProbability: number;
  confidence: number;
  recommendation: "Sue" | "Settle" | "Send Demand Letter" | "Do Nothing" | "Seek Mediation";
  estimatedCost: string;
  estimatedTimeline: string;
  jurisdiction: string;
  disputeType: string;
  strengths: string[];
  risks: string[];
  statutes: { cite: string; summary: string }[];
  precedents: { name: string; year: number; outcome: string; amount?: string; summary: string }[];
  strategy: { primary: string; rationale: string; alternatives: { name: string; tradeoff: string }[] };
  memo: {
    lawyer: string;
    client: string;
  };
  /** Situation Lab — exploratory intelligence */
  lab?: {
    liabilitySignal: "strong" | "mixed" | "weak";
    liabilityLabel: string;
    liabilityReasoning: string;
    situationSummary: string;
    evidenceGaps: { item: string; impact: string; priority: "high" | "medium" | "low"; haveIt: boolean }[];
    redTeam: { theirArgument: string; yourResponse: string }[];
    scenarios: { label: string; question: string; ifYes: string; signalShift: "stronger" | "weaker" | "neutral" }[];
    openQuestions: string[];
  };
  /** Ready-to-use deliverables — demand letters, checklists, scripts */
  actions?: {
    headline: string;
    plainEnglish: string;
    takeaways: string[];
    artifacts: { id: string; title: string; description: string; content: string; kind: "letter" | "checklist" | "script" | "timeline" | "brief" }[];
    timeline: { when: string; action: string }[];
  };
}

export const MOCK_RESULT: CaseResult = {
  winProbability: 71,
  confidence: 8,
  recommendation: "Send Demand Letter",
  estimatedCost: "$45K – $80K",
  estimatedTimeline: "14 – 22 months",
  jurisdiction: "California, USA",
  disputeType: "Employment — Wrongful Termination",
  strengths: [
    "Documented timeline of protected complaints prior to termination",
    "Two corroborating witnesses willing to testify",
    "Defendant has a settlement-prone history in similar suits",
    "Strong statutory hook under Cal. Lab. Code §1102.5",
  ],
  risks: [
    "Documentary evidence of employer pretext is thin",
    "Performance review three months prior was mixed",
    "At-will employment doctrine remains a defense baseline",
    "Damages calculation depends on contested mitigation efforts",
  ],
  statutes: [
    { cite: "Cal. Lab. Code §1102.5", summary: "Whistleblower protections; prohibits retaliation against employees who disclose information they reasonably believe evidences a violation of law." },
    { cite: "Cal. Lab. Code §98.6", summary: "Prohibits discharge or discrimination for engaging in protected conduct, including filing complaints with the Labor Commissioner." },
    { cite: "Title VII, 42 U.S.C. §2000e-3(a)", summary: "Federal anti-retaliation provision covering opposition to unlawful employment practices." },
    { cite: "Cal. Gov. Code §12940(h)", summary: "FEHA prohibition on retaliation for opposing practices forbidden under FEHA." },
  ],
  precedents: [
    { name: "Lawson v. PPG Industries", year: 2022, outcome: "Plaintiff verdict", amount: "$1.2M", summary: "Supreme Court of California clarified §1102.5 burden-shifting framework, easing plaintiff's prima facie burden." },
    { name: "Diego v. Pilgrim United Sch. Dist.", year: 2020, outcome: "Settled", amount: "$480K", summary: "Pre-trial settlement after summary judgment denied on retaliation claim with comparable facts." },
    { name: "People ex rel. Garcia-Brower v. Kolla's", year: 2021, outcome: "Plaintiff verdict", summary: "Broadened the scope of 'disclosure' under §1102.5 to include information already known to the employer." },
    { name: "Patten v. Grant Joint Union High Sch. Dist.", year: 2005, outcome: "Defense verdict", summary: "Internal complaints to a direct supervisor about that supervisor's own conduct held outside §1102.5 — narrowly distinguishable on facts." },
  ],
  strategy: {
    primary: "Send Demand Letter",
    rationale: "The combination of strong statutory leverage (§1102.5 post-Lawson), a defendant with a documented pattern of settlement in analogous suits, and a moderate evidentiary record favors extracting value at the pre-litigation stage. A well-drafted demand letter referencing Lawson and quantifying exposure typically yields a settlement offer within 30–60 days at 40–65% of projected verdict value, while preserving the option to file.",
    alternatives: [
      { name: "File suit immediately", tradeoff: "Higher potential upside and discovery leverage, but adds 12+ months and $30K+ in costs before realistic settlement window." },
      { name: "EEOC / DFEH complaint first", tradeoff: "Preserves federal claims and exhausts administrative remedies, but slows the timeline by 6–10 months and signals risk-aversion to opposing counsel." },
      { name: "Mediation via JAMS", tradeoff: "Fast and cheap if defendant agrees, but the request itself anchors expectations low and defendant has no current incentive to participate." },
    ],
  },
  memo: {
    lawyer: `MEMORANDUM OF CASE ASSESSMENT

RE:        Potential claim — Wrongful Termination in Violation of Public Policy (Cal. Lab. Code §1102.5)
JURISDICTION: Superior Court of California
PREPARED BY: Verdict Multi-Agent Analysis Pipeline
DATE:      ${new Date().toLocaleDateString()}

I.   STATEMENT OF FACTS
The client, formerly employed by Defendant in a senior individual-contributor capacity, alleges termination on or about [DATE] in retaliation for internal disclosures concerning suspected violations of state wage-and-hour law and federal securities reporting obligations. Disclosures were made to direct management and to Compliance, in writing, on three separate occasions in the ninety (90) days preceding termination. Two co-workers are prepared to corroborate the temporal proximity and substance of the disclosures.

II.  APPLICABLE LAW
California Labor Code §1102.5 prohibits an employer from retaliating against an employee who discloses information the employee reasonably believes evidences a violation of state or federal statute. Following Lawson v. PPG Industries, Inc., 12 Cal. 5th 703 (2022), once a plaintiff establishes by a preponderance of the evidence that protected activity was a contributing factor to an adverse employment action, the burden shifts to the employer to demonstrate by clear and convincing evidence that the action would have occurred for legitimate, independent reasons. Title VII anti-retaliation provisions and FEHA §12940(h) provide overlapping federal and state protections that may be pled in the alternative.

III. ANALYSIS
The temporal proximity (≤90 days), written record of disclosures, and corroborating witness testimony are sufficient to establish a prima facie case under the Lawson framework. The principal evidentiary risk lies in Defendant's contemporaneous performance documentation, which — while mixed — does not on its current face satisfy the clear-and-convincing standard. Comparator evidence from Diego (2020) and Garcia-Brower (2021) supports a favorable outcome posture.

IV.  RECOMMENDATION
Issue a pre-litigation demand letter citing Lawson and quantifying exposure at $1.1M–$1.6M (lost wages, emotional distress, statutory penalties, and projected attorneys' fees under §1102.5(j)). Set a 30-day response window. Preserve all claims, including parallel DFEH filing if no good-faith response is received.

V.   ASSESSMENT
Win probability: 71% (±8%). Estimated cost to verdict: $45K–$80K. Estimated timeline: 14–22 months. Settlement-likely window: 30–90 days post-demand.`,
    client: `Here's what we found, in plain English.

You almost certainly have a real case. Our analysis puts your chances of winning at about 71%, which is strong. The law in California is on your side — there's a recent ruling (Lawson, 2022) that makes it easier for people in your situation to prove retaliation.

What we'd recommend: don't file a lawsuit yet. Instead, send a "demand letter" first. This is a formal letter from a lawyer that lays out your case and asks the company to settle. Companies like the one you're dealing with usually respond within 30–60 days and often settle at this stage, which means you'd get paid faster, with much less cost, and without years in court.

If they ignore the letter or lowball you, you still have the option to sue. Filing a full lawsuit would cost roughly $45K–$80K and take 14–22 months to reach a verdict, but the potential payout is meaningfully larger.

Your strongest cards: the written record of your complaints, the timing (you were fired soon after complaining), and two coworkers willing to back you up. The weakest spot: some of your performance reviews weren't great, and the company will lean on that. A good lawyer can manage this.

Next step: send the demand letter from your Action Pack this month.`,
  },
  lab: {
    liabilitySignal: "mixed",
    liabilityLabel: "Liability is plausible but disputed",
    liabilityReasoning:
      "Liability is plausible but disputed for a Employment — Wrongful Termination in California, USA. The combination of statutory leverage and moderate evidentiary record favors pre-litigation pressure, but employer pretext documentation remains thin…",
    situationSummary:
      "Termination shortly after internal whistleblower disclosures. Written complaints to management and Compliance. Two coworkers willing to corroborate timeline.",
    evidenceGaps: [
      {
        item: "Written complaints / HR emails",
        impact: "Proves protected activity and timeline before termination",
        priority: "high",
        haveIt: true,
      },
      {
        item: "Performance reviews (last 12 months)",
        impact: "Employer will use mixed reviews as pretext — you need the full record",
        priority: "high",
        haveIt: false,
      },
      {
        item: "Witness statements",
        impact: "Corroborates retaliation narrative vs. employer's story",
        priority: "high",
        haveIt: true,
      },
      {
        item: "Termination letter / separation docs",
        impact: "Official reason for firing — compare to real motive",
        priority: "medium",
        haveIt: false,
      },
      {
        item: "Comparator employees (who wasn't fired)",
        impact: "Shows disparate treatment for similar conduct",
        priority: "medium",
        haveIt: false,
      },
    ],
    redTeam: [
      {
        theirArgument: "Documentary evidence of employer pretext is thin",
        yourResponse:
          "Documented timeline of protected complaints prior to termination",
      },
      {
        theirArgument: "Performance was declining — termination was legitimate",
        yourResponse:
          "Temporal proximity and written disclosures under §1102.5 shift burden to employer under Lawson",
      },
    ],
    scenarios: [
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
    ],
    openQuestions: [
      "Is Send Demand Letter the right first move given what we know?",
      "What's the statute of limitations in California, USA?",
      "What would a free consultation with a local attorney cost vs. what we'd learn?",
    ],
  },
};
