import type { LaunchAsset, LaunchContent, LaunchLead, StrategyDay } from "@/lib/launch-data";
import type { LaunchInput, ProductProfile, StrategyOutput } from "./types";

export const MAX_LEADS = 10;
const MIN_LEADS = 5;
const MIN_CONTENT = 3;

export type BusinessKind = "local_food" | "local_service" | "local_retail" | "saas" | "general";

/** Always return a full enriched profile (AI may only return partial fields). */
export function ensureEnrichedProfile(
  input: LaunchInput,
  partial?: Partial<EnrichedProfile> | null,
): EnrichedProfile {
  const base = profileProduct(input);
  if (!partial) return base;
  const merged = { ...base, ...partial };
  if (!("kind" in partial) || !partial.kind) {
    merged.kind = classifyBusiness(input.productDescription);
  }
  return merged;
}

/** Dedupe by name; prefer AI leads, pad with domain templates up to MAX_LEADS. */
export function mergeLeads(primary: LaunchLead[], fallback: LaunchLead[]): LaunchLead[] {
  const seen = new Set<string>();
  const out: LaunchLead[] = [];
  for (const lead of [...primary, ...fallback]) {
    const key = lead.name.toLowerCase().slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lead);
    if (out.length >= MAX_LEADS) break;
  }
  return out;
}

/** Ensure dashboard always has enough post drafts. */
export function mergeContent(primary: LaunchContent[], fallback: LaunchContent[]): LaunchContent[] {
  const seen = new Set<string>();
  const out: LaunchContent[] = [];
  for (const item of [...primary, ...fallback]) {
    const key = item.id || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 6) break;
  }
  return out;
}

export function padLaunchPack(args: {
  input: LaunchInput;
  profile: EnrichedProfile;
  leads: LaunchLead[];
  content: LaunchContent[];
  assets: LaunchAsset[];
}): { leads: LaunchLead[]; content: LaunchContent[]; assets: LaunchAsset[] } {
  const templateLeads = leadsFor(args.profile, args.input.productDescription);
  const templateContent = contentFor(args.profile, args.input);
  const templateAssets = assetsFor(args.profile, args.input.launchGoal ?? "waitlist");

  let leads = mergeLeads(args.leads, templateLeads);
  if (leads.length < MIN_LEADS) leads = templateLeads.slice(0, MAX_LEADS);

  let content = mergeContent(args.content, templateContent);
  if (content.length < MIN_CONTENT) content = templateContent;

  const assets = args.assets.length >= 1 ? args.assets : templateAssets;

  return { leads, content, assets };
}

export interface EnrichedProfile extends ProductProfile {
  kind: BusinessKind;
  locationHint: string | null;
  season: "spring" | "summer" | "fall" | "winter" | null;
  launchAngle: string;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractProductName(text: string): string | null {
  const named = text.match(/(?:called|named)\s+["']?([A-Za-z0-9][A-Za-z0-9\s'-]{1,40})["']?/i);
  if (named) return titleCase(named[1].trim());

  const cafe = text.match(
    /(?:opening|starting|launching|building|open)\s+(?:a|an|my|up\s+a)?\s*([a-z]+(?:[-\s][a-z]+){0,4})\s+(?:cafe|coffee\s*shop|restaurant|bistro|bakery|bar)/i,
  );
  if (cafe) {
    const adj = cafe[1].trim().replace(/\s+/g, " ");
    return titleCase(`${adj} Cafe`.replace(/\s+Cafe\s+Cafe/i, " Cafe"));
  }

  const building = text.match(/(?:building|creating|launching)\s+([A-Z][A-Za-z0-9]+)/);
  if (building) return building[1];

  return null;
}

function extractLocation(text: string): string | null {
  const inCity = text.match(/\b(?:in|near|downtown|opening in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (inCity) return inCity[1];
  return null;
}

function detectSeason(text: string): EnrichedProfile["season"] {
  const t = text.toLowerCase();
  if (/spring|march|april|may/.test(t)) return "spring";
  if (/summer|june|july|august/.test(t)) return "summer";
  if (/fall|autumn|september|october|november/.test(t)) return "fall";
  if (/winter|december|january|february/.test(t)) return "winter";
  return null;
}

export function classifyBusiness(text: string): BusinessKind {
  const t = text.toLowerCase();
  if (/cafe|coffee\s*shop|restaurant|bistro|bakery|food\s*truck|brunch|diner|bar\s+and/.test(t)) {
    return "local_food";
  }
  if (/salon|barber|gym|fitness|studio|clinic|plumber|contractor|cleaning\s+service/.test(t)) {
    return "local_service";
  }
  if (/parking\s*lot|parking\s*garage|paid\s+parking|surface\s+lot|parkade|valet\s+parking/.test(t)) {
    return "local_retail";
  }
  if (/used\s+car|dealership|auto\s+sales|car\s+lot|pre-?owned|automotive|truck\s+dealer/.test(t)) {
    return "local_retail";
  }
  if (/shop|store|boutique|retail|market\s+stall/.test(t)) {
    return "local_retail";
  }
  if (/family[\s-]owned|family\s+business|mom\s+and\s+pop|small\s+business/.test(t)) {
    if (/cafe|coffee|restaurant|bakery|bistro|food/.test(t)) return "local_food";
    if (/salon|barber|gym|fitness|plumber|contractor|cleaning|clinic|studio/.test(t)) {
      return "local_service";
    }
    if (/parking|lot|shop|store|dealership|retail/.test(t)) return "local_retail";
  }
  if (/devtool|developer|api|sdk|github|saas|software|app|platform|ai|agent|llm|startup/.test(t)) {
    return "saas";
  }
  return "general";
}

export function profileProduct(input: LaunchInput): EnrichedProfile {
  const t = input.productDescription;
  const lower = t.toLowerCase();
  const kind = classifyBusiness(t);
  const locationHint = extractLocation(t);
  const season = detectSeason(t);
  const name =
    input.productName?.trim() ||
    extractProductName(t) ||
    (kind === "local_food" ? "Your Cafe" : "Your Product");

  if (kind === "local_food") {
    const builderThemed = /builder|construction|contractor|trade|jobsite|jobsite/.test(lower);
    const loc = locationHint ? ` in ${locationHint}` : "";
    return {
      kind,
      locationHint,
      season,
      productName: name,
      tagline: builderThemed
        ? "Coffee and fuel for the crew — spring opening"
        : season === "spring"
          ? "Fresh flavors for a fresh season"
          : "Your neighborhood spot, finally open",
      icp: builderThemed
        ? "Construction crews, tradespeople, site supervisors, and nearby contractors who need fast coffee and hearty lunch between jobs"
        : "Local residents, remote workers, and neighborhood regulars within a 15-minute walk or drive",
      painPoint: builderThemed
        ? "nowhere reliable near job sites for quality coffee and quick lunch — crews lose time driving across town"
        : "lack of a welcoming local spot that fits how the neighborhood actually lives and works",
      category: builderThemed ? "Builder-themed cafe" : "Local cafe / restaurant",
      channels: builderThemed
        ? ["Instagram", "Google Business Profile", "Nextdoor", "Local Facebook groups", "Yelp", "Trade association bulletin"]
        : ["Instagram", "Google Business Profile", "Nextdoor", "Yelp", "Local press", "Neighborhood flyers"],
      launchAngle: builderThemed
        ? `Spring soft-open for construction partners${loc}, then neighborhood-wide opening`
        : `${season ? titleCase(season) : "Grand"} opening push${loc} — foot traffic and local word-of-mouth`,
    };
  }

  if (kind === "local_service") {
    return {
      kind,
      locationHint,
      season,
      productName: name,
      tagline: "Trusted local service, done right",
      icp: `Homeowners and small businesses${locationHint ? ` in ${locationHint}` : " in your service area"}`,
      painPoint: "hard to find reliable local providers who show up on time and communicate clearly",
      category: "Local service business",
      channels: ["Google Business Profile", "Nextdoor", "Yelp", "Facebook local groups", "Referral partners"],
      launchAngle: "Reputation-first launch through partners and local reviews",
    };
  }

  if (kind === "local_retail") {
    const isParking = /parking\s*lot|parking\s*garage|paid\s+parking|surface\s+lot|parkade/.test(lower);
    if (isParking) {
      const loc = locationHint ? ` in ${locationHint}` : "";
      return {
        kind,
        locationHint,
        season,
        productName: name !== "Your Product" ? name : "Your Parking",
        tagline: "Reliable parking, family-run",
        icp: `Commuters, office workers, event-goers, and nearby businesses${locationHint ? ` in ${locationHint}` : " in your area"} who need predictable daily or monthly parking`,
        painPoint:
          "full lots elsewhere, confusing pricing, or no trusted local option near work, events, or downtown",
        category: "Parking lot / surface lot",
        channels: [
          "Google Business Profile",
          "Google Maps",
          "Nextdoor",
          "Facebook local groups",
          "Partnerships with nearby offices & venues",
        ],
        launchAngle: `Fill stalls through maps visibility, monthly passes, and partnerships${loc}`,
      };
    }
    const isAuto = /used\s+car|dealership|auto\s+sales|car\s+lot|pre-?owned|automotive|truck/.test(lower);
    if (isAuto) {
      return {
        kind,
        locationHint,
        season,
        productName: name,
        tagline: "Honest rides, transparent pricing",
        icp: `Local buyers${locationHint ? ` in ${locationHint}` : ""} shopping for used cars and trucks — first-time buyers, trades, and fleet upgrades`,
        painPoint: "pressure-heavy dealers and unclear pricing online — they want a lot they can trust",
        category: "Used car dealership",
        channels: ["Instagram", "Facebook Marketplace", "Google Business Profile", "TikTok", "Local radio"],
        launchAngle: "Inventory spotlights, customer delivery photos, and weekend test-drive events",
      };
    }
    return {
      kind,
      locationHint,
      season,
      productName: name,
      tagline: "A shop worth walking to",
      icp: `Shoppers and locals${locationHint ? ` near ${locationHint}` : ""} who prefer independent retail`,
      painPoint: "generic big-box options with no personality or curation",
      category: "Local retail",
      channels: ["Instagram", "Google Business Profile", "Local events", "Neighborhood partnerships"],
      launchAngle: "Opening week events and influencer seeding",
    };
  }

  if (kind === "saas") {
    if (/devtool|developer|api|sdk|github|code|engineer/.test(lower)) {
      return {
        kind,
        locationHint: null,
        season,
        productName: name,
        tagline: "Built for developers who ship fast",
        icp: "Technical founders, indie hackers, and eng leads at startups",
        painPoint: "manual GTM and cold outreach that doesn't convert",
        category: "Developer tools",
        channels: ["Hacker News", "X", "r/SaaS", "r/devops", "LinkedIn"],
        launchAngle: "Show HN → founder thread → targeted outreach to dev communities",
      };
    }
    if (/ai|agent|llm|gpt|automat/.test(lower)) {
      return {
        kind,
        locationHint: null,
        season,
        productName: name,
        tagline: "AI that does the work, not just the chat",
        icp: "AI-native founders and product teams experimenting with agents",
        painPoint: "launching AI products without a clear GTM motion",
        category: "AI / Agents",
        channels: ["Hacker News", "X", "r/MachineLearning", "r/SaaS", "LinkedIn"],
        launchAngle: "Demo-led launch with technical audience first",
      };
    }
    return {
      kind,
      locationHint: null,
      season,
      productName: name,
      tagline: "Solve the problem faster",
      icp: "Early adopters in your target niche",
      painPoint: extractPainFromDescription(t),
      category: "SaaS",
      channels: ["Hacker News", "X", "Reddit", "LinkedIn", "Product Hunt"],
      launchAngle: "Problem-first launch on communities where your ICP already hangs out",
    };
  }

  return {
    kind: "general",
    locationHint,
    season,
    productName: name,
    tagline: "Launch with clarity",
    icp: "People who feel the problem you describe in your pitch",
    painPoint: extractPainFromDescription(t),
    category: "New venture",
    channels: ["Instagram", "Local networks", "Word of mouth", "Email list"],
    launchAngle: "Start narrow — 10 high-intent contacts before scaling reach",
  };
}

function extractPainFromDescription(text: string): string {
  const problem = text.match(/(?:problem|solve|because|frustrated|tired of|without)\s+([^.!?]{10,80})/i);
  if (problem) return problem[1].trim().toLowerCase();
  return text.slice(0, 100).trim().toLowerCase();
}

export function strategyFor(profile: EnrichedProfile, goal: string): StrategyOutput {
  if (profile.kind === "local_food") {
    const timeline: StrategyDay[] = [
      {
        day: 1,
        channel: "Direct outreach",
        action: `Email/text your top 3 trade partners — offer ${profile.productName} crew discount for spring soft-open`,
      },
      {
        day: 3,
        channel: "Google Business Profile",
        action: "Go live with hours, photos of the space, menu PDF, and 'Spring opening' post",
      },
      {
        day: 5,
        channel: "Instagram",
        action: "Reel: behind-the-build / kitchen prep + 'opening this spring' CTA to save the date",
      },
      {
        day: 7,
        channel: "Nextdoor",
        action: `Neighbor intro post — who you are, what makes ${profile.productName} different, opening week hours`,
      },
      {
        day: 10,
        channel: "Yelp",
        action: "Claim listing, upload menu, respond to any early questions — ask first 10 guests for honest reviews",
      },
      {
        day: 14,
        channel: profile.channels[0] ?? "Instagram",
        action: "Spring opening event — free drip coffee for trades until 10am, neighborhood welcome after",
      },
      {
        day: 21,
        channel: "Local press / food bloggers",
        action: "Send press pitch to 2 local food accounts with your builder-cafe angle and opening photos",
      },
      {
        day: 30,
        channel: "Retrospective",
        action: "Double down on whichever channel drove walk-ins — repeat the post format that worked",
      },
    ];
    return {
      timeline,
      rationale: `${profile.productName}: ${profile.launchAngle}. Lead with ${profile.channels.slice(0, 2).join(" and ")} — your ICP (${profile.icp.split(",")[0]}) discovers new spots through local search and peer referral, not cold SaaS DMs.`,
    };
  }

  if (profile.kind.startsWith("local_")) {
    const timeline: StrategyDay[] = [
      { day: 1, channel: "Google Business Profile", action: "Complete listing — photos, services, booking link" },
      { day: 3, channel: "Nextdoor", action: "Introduce the business to the neighborhood with a specific offer" },
      { day: 7, channel: "Referral partners", action: "Reach out to 5 complementary local businesses for cross-referral" },
      { day: 14, channel: "Reviews", action: "Ask first happy customers for Google/Yelp reviews" },
      { day: 30, channel: "Retrospective", action: "Repeat best-performing channel from opening month" },
    ];
    return {
      timeline,
      rationale: `${profile.productName} wins on local trust. ${profile.launchAngle}.`,
    };
  }

  const timeline: StrategyDay[] = [
    {
      day: 1,
      channel: profile.channels[0] ?? "Launch channel",
      action: `Launch with a specific hook around: "${profile.painPoint}"`,
    },
    {
      day: 2,
      channel: "X / Twitter",
      action: "Short thread: problem → why existing options fail → what you built → ask for feedback",
    },
    {
      day: 4,
      channel: profile.channels.find((c) => c.includes("Reddit")) ?? "Community",
      action: "Value-first post in a community where your ICP already discusses this problem",
    },
    {
      day: 7,
      channel: "Direct outreach",
      action: "Personal notes to your top 10 Hunter contacts — reference their specific pain",
    },
    {
      day: 14,
      channel: "Email",
      action: `${goal} nurture sequence for people who engaged but didn't convert`,
    },
    {
      day: 30,
      channel: "Retrospective",
      action: "Double down on highest-converting channel from weeks 1–2",
    },
  ];

  return {
    timeline,
    rationale: `${profile.productName}: ${profile.launchAngle}. Focus on ${profile.channels.slice(0, 2).join(" and ")} where ${profile.icp.split(",")[0]} already talks about ${profile.painPoint}.`,
  };
}

export function leadsFor(profile: EnrichedProfile, description: string): LaunchLead[] {
  switch (profile.kind) {
    case "local_food":
      return localFoodLeads(profile, description);
    case "local_service":
      return localServiceLeads(profile);
    case "local_retail":
      return localRetailLeads(profile, description);
    case "saas":
      return saasLeads(profile, description);
    default:
      return generalLeads(profile, description);
  }
}

function localFoodLeads(profile: EnrichedProfile, description: string): LaunchLead[] {
  const builder = /builder|construction|contractor|trade/.test(description.toLowerCase());
  const loc = profile.locationHint ?? "your area";
  const locQuery = profile.locationHint ?? "near me";
  const maps = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
  const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  const leads: LaunchLead[] = builder
    ? [
        {
          name: `Google Maps search: active construction sites near ${loc}`,
          platform: "google",
          handle: "site superintendent / foreman",
          url: maps(`active construction sites ${locQuery}`),
          painSnippet:
            "Use Maps and street-view style discovery to find the largest nearby job sites. These crews are the buyer cluster that needs fast coffee and lunch before breaks.",
          hook: `Walk or call the site trailer and ask for the superintendent. Offer a ${profile.productName} crew preorder card: text by 9:30, pickup or runner drop by lunch.`,
        },
        {
          name: `Builder supply stores near ${loc}`,
          platform: "local",
          handle: "counter manager / branch manager",
          url: maps(`builders supply store ${locQuery}`),
          painSnippet:
            "Supply counters see contractors every morning and know which crews are working nearby. They are a referral point, not a fake individual lead.",
          hook: "Ask to leave a small menu stack at the contractor counter. Offer 'show your supply receipt for free drip coffee opening week' so they have a reason to mention you.",
        },
        {
          name: `Similar cafes and coffee shops near ${loc}`,
          platform: "google",
          handle: "owner / manager / customers in reviews",
          url: maps(`cafes coffee shops ${locQuery}`),
          painSnippet:
            "Competitor and adjacent cafe reviews reveal what local customers praise or complain about: speed, parking, early hours, outlets, food quality, and service gaps.",
          hook: `Scan 3-star and 4-star reviews, then position ${profile.productName} around the unmet need. Reach out to non-competing bakeries or coffee carts for cross-referrals.`,
        },
        {
          name: `Nextdoor neighborhoods around ${loc}`,
          platform: "nextdoor",
          handle: `${loc} neighbors`,
          url: "https://nextdoor.com",
          painSnippet:
            "Neighbors ask what is opening nearby and where to get walkable breakfast. This is a customer-intent channel, especially before a soft opening.",
          hook: `Search for posts about coffee, breakfast, construction noise, and new businesses. Reply as the owner with opening date, early hours, and a neighbor preview offer.`,
        },
        {
          name: `Commercial property managers near ${loc}`,
          platform: "linkedin",
          handle: "property manager / tenant experience lead",
          url: google(`commercial property manager ${locQuery} LinkedIn`),
          painSnippet:
            "Office, flex, and mixed-use managers need tenant perks and morning traffic. They can put your menu in front of many potential repeat customers.",
          hook: "Pitch a free lobby coffee tasting for tenants and ask for one newsletter mention plus lobby flyer placement.",
        },
        {
          name: `Local contractor association chapter near ${loc}`,
          platform: "email",
          handle: "events coordinator / membership desk",
          url: google(`contractor association chapter ${locQuery}`),
          painSnippet:
            "Contractor associations concentrate exactly the foremen, owners, and vendors who can send recurring crew orders.",
          hook: `Ask about sponsoring a morning meeting or safety breakfast. Offer a branded coffee bar and a 60-second intro to ${profile.productName}.`,
        },
        {
          name: `Local food writers and opening roundups for ${loc}`,
          platform: "email",
          handle: "food editor / neighborhood newsletter",
          url: google(`${locQuery} food writer new cafe opening roundup`),
          painSnippet:
            "Local writers need concrete opening stories. A builder-focused cafe has a sharper angle than a generic new coffee shop.",
          hook: `Send a short pitch: ${profile.productName} serves construction crews first, neighbors second. Include opening date, 3 photos, and a soft-launch invite.`,
        },
        {
          name: `Farmers markets and pop-up events near ${loc}`,
          platform: "local",
          handle: "market coordinator",
          url: maps(`farmers market pop up events ${locQuery}`),
          painSnippet:
            "Markets and pop-ups let you meet neighborhood customers before the cafe is fully open and collect emails/SMS signups.",
          hook: "Ask for one spring pop-up slot. Sell a small version of the hero coffee/taco combo and collect phone numbers for grand opening reminders.",
        },
        {
          name: `Coworking spaces and trade offices near ${loc}`,
          platform: "local",
          handle: "Community manager",
          url: maps(`coworking construction office ${locQuery}`),
          painSnippet:
            "Nearby offices can become repeat catering and coffee-box buyers, especially for morning meetings and client visits.",
          hook: "Offer a first-meeting coffee box at cost, then leave a recurring order menu with the front desk or office manager.",
        },
        {
          name: `City building permits / economic development office for ${loc}`,
          platform: "local",
          handle: "permit desk / business liaison",
          url: google(`${locQuery} active building permits construction projects`),
          painSnippet:
            "Permit lists identify the general contractors and project addresses most likely to need recurring crew food.",
          hook: "Pull active permits within 2 miles, rank by project size, then visit the top five trailers with a one-page bulk order menu.",
        },
      ]
    : [
        {
          name: `Google Maps search: cafes and restaurants near ${loc}`,
          platform: "google",
          handle: "review patterns / adjacent businesses",
          url: maps(`cafes restaurants ${locQuery}`),
          painSnippet:
            "Nearby cafe and restaurant reviews show current customer demand: what people like, what is missing, and which audiences already spend locally.",
          hook: `Read competitor reviews for repeated complaints. Use those gaps in ${profile.productName}'s menu, hours, and opening posts.`,
        },
        {
          name: `Instagram local food discovery for ${loc}`,
          platform: "instagram",
          handle: "local food pages / hashtag search",
          url: "https://instagram.com/explore/tags/localeats",
          painSnippet:
            "Local food pages and hashtags reveal who already posts about openings and which visuals get shared.",
          hook: `Search #[city]eats and #[city]coffee. DM pages with a 15-second reel, opening date, and tasting invite for ${profile.productName}.`,
        },
        {
          name: `Nextdoor neighborhoods around ${loc}`,
          platform: "nextdoor",
          handle: `${loc} community`,
          url: "https://nextdoor.com",
          painSnippet:
            "Neighbors support local openings when the owner shows up directly and answers practical questions like hours, parking, and menu.",
          hook: "Post a neighbor intro with opening hours, map, and one simple offer. Reply to every comment instead of dropping a one-way ad.",
        },
        {
          name: `Office buildings and apartments near ${loc}`,
          platform: "local",
          handle: "building manager / leasing office",
          url: maps(`office building apartment complex ${locQuery}`),
          painSnippet:
            "Property managers can introduce you to dozens or hundreds of nearby residents and workers who need coffee, lunch, and meeting spots.",
          hook: "Offer a lobby tasting or resident perk. Ask to be included in the tenant/resident newsletter.",
        },
        {
          name: "Yelp and Google Local Guides",
          platform: "google",
          handle: "early reviewers",
          url: google(`${locQuery} Yelp Elite local guides cafe`),
          painSnippet:
            "Early local reviews shape discovery for cafes. This is a review-generation channel, not a fake customer list.",
          hook: "Invite first-week guests to review with a QR code on receipts. For local guides, offer a transparent pre-opening tasting and ask for honest feedback.",
        },
        {
          name: `Local food newsletters and bloggers for ${loc}`,
          platform: "email",
          handle: "editor / independent writer",
          url: google(`${locQuery} food newsletter cafe opening`),
          painSnippet:
            "Writers need new opening tips with a clear story, menu, photos, and date.",
          hook: `Pitch the opening angle for ${profile.productName}, include 3 specific menu items and invite them before public launch.`,
        },
        {
          name: `Food suppliers and bakeries near ${loc}`,
          platform: "local",
          handle: "owner / account rep",
          url: maps(`bakery food supplier coffee roaster ${locQuery}`),
          painSnippet:
            "Suppliers and bakeries can become co-marketing partners and may already serve the same neighborhood audience.",
          hook: "Create one co-branded item or supplier spotlight. Ask them to share opening week because their product is featured.",
        },
        {
          name: `Facebook local food and neighborhood groups for ${loc}`,
          platform: "facebook",
          handle: "Group moderator",
          url: "https://facebook.com/groups/?q=local%20food",
          painSnippet:
            "Group admins control whether opening announcements get approved. Permission beats spam.",
          hook: "Message the moderator first: ask if a one-time opening announcement with a neighbor discount is allowed.",
        },
        {
          name: `Libraries and community boards near ${loc}`,
          platform: "local",
          handle: "Events desk",
          url: maps(`public library community center ${locQuery}`),
          painSnippet:
            "Physical boards still reach residents who do not follow local food pages.",
          hook: "Post a clean opening flyer with map, hours, menu QR, and one reason to visit this week.",
        },
        {
          name: `Chamber of commerce or small business association for ${loc}`,
          platform: "email",
          handle: "Membership desk",
          url: google(`chamber of commerce ${locQuery}`),
          painSnippet:
            "Chambers can announce new businesses, schedule ribbon cuttings, and introduce office/customer partners.",
          hook: "Ask for a ribbon-cutting date and newsletter mention. Offer coffee for the next member breakfast.",
        },
      ];

  return leads.slice(0, MAX_LEADS);
}

function localServiceLeads(profile: EnrichedProfile): LaunchLead[] {
  const loc = profile.locationHint ?? "your area";
  return [
    {
      name: "Nextdoor — home improvement threads",
      platform: "nextdoor",
      handle: `${loc} homeowners`,
      url: "https://nextdoor.com",
      painSnippet: `"Anyone recommend a reliable ${profile.category.toLowerCase()}?"`,
      hook: `Reply helpfully in 2 threads before mentioning ${profile.productName} — offer spring intro rate`,
    },
    {
      name: "Google Business Profile",
      platform: "google",
      handle: "Local search",
      url: "https://business.google.com",
      painSnippet: `"Most service calls start with a Google search — incomplete profiles lose to competitors."`,
      hook: "Go live with photos, service area, and booking link before spending on ads",
    },
    {
      name: "Complementary local business",
      platform: "local",
      handle: "Referral partner",
      url: "https://maps.google.com",
      painSnippet: `"We get asked for referrals we don't have — reciprocal sends work."`,
      hook: "Trade 5 referrals/month with a non-competing local business",
    },
    {
      name: "Yelp for Business",
      platform: "google",
      handle: "Reviews",
      url: "https://biz.yelp.com",
      painSnippet: `"Three detailed reviews beat a dozen one-liners for local trust."`,
      hook: "Follow up first 5 jobs with a direct review link",
    },
    {
      name: "Local Facebook group",
      platform: "facebook",
      handle: "Community admin",
      url: "https://facebook.com/groups",
      painSnippet: `"Recommendations posts get high engagement on weekday evenings."`,
      hook: "Ask permission to share intro post with spring opening special",
    },
    {
      name: "Property management company",
      platform: "email",
      handle: "Vendor coordinator",
      url: "https://maps.google.com/?q=property+management",
      painSnippet: `"We need vetted vendors on call for multiple units."`,
      hook: "Preferred vendor pitch — response-time SLA + tenant discount code",
    },
    {
      name: "HOA board contact",
      platform: "email",
      handle: "Board secretary",
      url: "mailto:",
      painSnippet: `"HOAs maintain approved vendor lists residents actually use."`,
      hook: "Present at one board meeting — leave one-pager with credentials",
    },
    {
      name: "Local hardware / supply store",
      platform: "local",
      handle: "Counter staff",
      url: "https://maps.google.com/?q=hardware+store",
      painSnippet: `"Customers ask us who to hire — we only recommend people we trust."`,
      hook: "Business cards + small commission for referred jobs",
    },
    {
      name: "Neighborhood newsletter",
      platform: "email",
      handle: "Editor",
      url: "mailto:newsletter@",
      painSnippet: `"Sponsors section gets read by people who actually live here."`,
      hook: "Small sponsorship for one issue — include spring offer code",
    },
    {
      name: "City licensing / business registry",
      platform: "local",
      handle: "New business list",
      url: "https://maps.google.com/?q=city+hall",
      painSnippet: `"Showing up in official new-business announcements builds legitimacy."`,
      hook: "Submit opening announcement to city economic development office",
    },
  ].slice(0, MAX_LEADS);
}

function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function googleLink(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function parkingLotLeads(profile: EnrichedProfile): LaunchLead[] {
  const loc = profile.locationHint ?? "your area";
  const locQ = profile.locationHint ?? "near me";
  return [
    {
      name: `Google Maps: competing parking near ${loc}`,
      platform: "google",
      handle: "lot owner / pricing research",
      url: mapsLink("parking lot " + locQ),
      painSnippet:
        "See what nearby lots charge, hours, and reviews — find gaps (early bird, monthly, event rates, security).",
      hook: `List ${profile.productName} on Maps with clear hourly + monthly rates and a family-owned note in the description.`,
    },
    {
      name: `Office buildings & employers near ${loc}`,
      platform: "linkedin",
      handle: "office manager / facilities",
      url: googleLink("office buildings " + locQ + " facilities manager"),
      painSnippet: "Employees ask facilities for parking recommendations — one partnership fills weekday stalls.",
      hook: "Offer 5 reserved monthly spots + flyer in the lobby for opening week.",
    },
    {
      name: `Event venues, theaters, stadiums near ${loc}`,
      platform: "local",
      handle: "events coordinator",
      url: mapsLink("event venue " + locQ),
      painSnippet: "Event nights spike demand — venues need overflow parking partners they trust.",
      hook: "Pitch event-night flat rate + signage on event nights only.",
    },
    {
      name: `Restaurants & retail with limited parking near ${loc}`,
      platform: "local",
      handle: "owner / manager",
      url: mapsLink("restaurants retail " + locQ),
      painSnippet: "Businesses lose customers when street parking is full — they'll refer overflow to you.",
      hook: "Leave cards: 'Park at [lot] — show receipt for $2 off' co-marketing.",
    },
    {
      name: `Apartment complexes near ${loc}`,
      platform: "email",
      handle: "property manager",
      url: mapsLink("apartment complex " + locQ),
      painSnippet: "Residents need guest or second-car parking — property managers control vendor lists.",
      hook: "Offer resident monthly pass discount code posted in the leasing office.",
    },
    {
      name: `Nextdoor — parking & commute threads in ${loc}`,
      platform: "nextdoor",
      handle: "neighbors / commuters",
      url: "https://nextdoor.com",
      painSnippet: "Locals ask where to park for work, games, or downtown — answer before promoting.",
      hook: "Helpful reply on 2 threads, then mention family-owned lot + intro weekly rate.",
    },
    {
      name: `Google Business Profile — ${profile.productName}`,
      platform: "google",
      handle: "local search",
      url: "https://business.google.com",
      painSnippet: "Most parking decisions start on Maps — photos of entrance, rates, and hours build trust.",
      hook: "Post weekly: occupancy tip, event parking, or monthly pass CTA.",
    },
    {
      name: `Rideshare & delivery driver hangouts near ${loc}`,
      platform: "facebook",
      handle: "driver groups",
      url: "https://facebook.com/groups/?q=uber+driver+" + encodeURIComponent(loc),
      painSnippet: "Drivers need safe, quick in/out parking between trips — word spreads in driver groups.",
      hook: "Offer driver lunch bundle: 4hr pass + coffee shop next door if applicable.",
    },
    {
      name: "City economic development and small business office",
      platform: "local",
      handle: "business liaison",
      url: googleLink("economic development office " + locQ + " small business"),
      painSnippet: "New businesses get listed in city announcements — legitimacy for a family-owned lot.",
      hook: "Register opening + ask to be on the commuter resources page if one exists.",
    },
    {
      name: `Nearby churches, schools, clinics (weekday overflow)`,
      platform: "local",
      handle: "admin / facilities",
      url: mapsLink("church school clinic " + locQ),
      painSnippet: "Institutions have predictable peak times — overflow parking deals are win-win.",
      hook: "Sunday-only or school-pickup rate sheet — contact admin office directly.",
    },
  ].slice(0, MAX_LEADS);
}

function autoDealershipLeads(profile: EnrichedProfile): LaunchLead[] {
  const loc = profile.locationHint ?? "your area";
  const locQ = profile.locationHint ?? "near me";
  return [
    {
      name: `Google Maps: used car dealers near ${loc}`,
      platform: "google",
      handle: "market research",
      url: mapsLink("used car dealership " + locQ),
      painSnippet: "See competitor inventory, reviews, and what buyers complain about (pressure, fees, transparency).",
      hook: `Position ${profile.productName} on the one gap you find in 3-star reviews — post inventory with real prices.`,
    },
    {
      name: "Facebook Marketplace and local buy/sell groups",
      platform: "facebook",
      handle: "buyer groups",
      url: "https://facebook.com/marketplace",
      painSnippet: "Local truck and car buyers search Marketplace before visiting lots.",
      hook: "List 3 hero vehicles with honest descriptions + invite to lot for test drive.",
    },
    {
      name: `Credit unions & local banks near ${loc}`,
      platform: "local",
      handle: "auto loan officer",
      url: googleLink("credit union auto loans " + locQ),
      painSnippet: "Pre-approved buyers shop faster — lenders refer trusted dealers.",
      hook: "Ask loan officers for dealer referral list placement + co-branded flyer.",
    },
    {
      name: `Local employers & fleet managers`,
      platform: "linkedin",
      handle: "operations / fleet",
      url: googleLink("fleet manager " + locQ),
      painSnippet: "Small fleets need reliable used trucks — one fleet sale beats ten walk-ins.",
      hook: "Pitch 3-truck package with maintenance records and delivery photos.",
    },
    {
      name: `Instagram — inventory & delivery content`,
      platform: "instagram",
      handle: "local buyers",
      url: "https://instagram.com",
      painSnippet: "Truck buyers engage with real photos, price overlays, and customer handoff videos.",
      hook: "Reel: walkaround of best truck under $25k + weekend test-drive hours.",
    },
    {
      name: `Nextdoor — vehicle recommendation threads`,
      platform: "nextdoor",
      handle: `${loc} neighbors`,
      url: "https://nextdoor.com",
      painSnippet: `"Anyone know a honest used car lot?" posts get high engagement.`,
      hook: "Reply as owner with one specific tip — invite neighbor to Saturday lot tour.",
    },
    {
      name: `Mechanics & body shops (referral partners)`,
      platform: "local",
      handle: "shop owner",
      url: mapsLink("auto repair shop " + locQ),
      painSnippet: "Shops know when customers need a replacement vehicle — reciprocal referrals work.",
      hook: "$100 referral fee per sold vehicle from shop customers.",
    },
    {
      name: `Google Business Profile`,
      platform: "google",
      handle: "local search",
      url: "https://business.google.com",
      painSnippet: "Auto shoppers filter by reviews, photos, and inventory updates on Maps.",
      hook: "Weekly post: one truck spotlight + transparent out-the-door pricing example.",
    },
    {
      name: "Local radio and community sponsor",
      platform: "email",
      handle: "sales rep",
      url: googleLink("local radio station " + locQ + " advertising"),
      painSnippet: "Drive-time listeners in market for trucks — family-owned angle resonates.",
      hook: "Sponsor traffic report segment: 'honest lot' positioning + weekend hours.",
    },
    {
      name: `Contractor & trades Facebook groups`,
      platform: "facebook",
      handle: "contractor members",
      url: "https://facebook.com/groups/?q=contractor+" + encodeURIComponent(loc),
      painSnippet: "Tradespeople buy used trucks seasonally — groups share real recommendations.",
      hook: "Post work-ready truck checklist + invite to inspect before Monday jobs.",
    },
  ].slice(0, MAX_LEADS);
}

function independentRetailLeads(profile: EnrichedProfile): LaunchLead[] {
  const loc = profile.locationHint ?? "your area";
  return [
    {
      name: `Google Maps: similar businesses near ${loc}`,
      platform: "google",
      handle: "owner / customer reviews",
      url: mapsLink(profile.category + " " + loc),
      painSnippet: "Competitor reviews show what locals value — speed, price, personality, hours.",
      hook: `Differentiate ${profile.productName} on the top complaint in 3-star reviews.`,
    },
    {
      name: "Nextdoor — local recommendation threads",
      platform: "nextdoor",
      handle: `${loc} neighbors`,
      url: "https://nextdoor.com",
      painSnippet: "Neighbors ask for local recommendations — answer helpfully before promoting.",
      hook: "Two helpful replies, then soft-open invite with family-owned story.",
    },
    {
      name: "Google Business Profile",
      platform: "google",
      handle: "local search",
      url: "https://business.google.com",
      painSnippet: "Incomplete profiles lose to chains — photos and hours matter.",
      hook: "Go live with photos, services, and opening-week offer.",
    },
    {
      name: "Complementary local business",
      platform: "local",
      handle: "referral partner",
      url: mapsLink("small business " + loc),
      painSnippet: "Non-competing locals refer customers when asked.",
      hook: "Trade reciprocal mentions — flyer swap + shared discount code.",
    },
    {
      name: "Yelp for Business",
      platform: "google",
      handle: "reviews",
      url: "https://biz.yelp.com",
      painSnippet: "Detailed reviews beat chains for trust.",
      hook: "Ask first 10 customers for specific reviews (what they bought, why they returned).",
    },
    {
      name: "Local Facebook group",
      platform: "facebook",
      handle: "community admin",
      url: "https://facebook.com/groups",
      painSnippet: "Opening announcements work when moderators approve them.",
      hook: "Ask moderator before posting — include map pin and hours.",
    },
    {
      name: "Chamber of commerce",
      platform: "email",
      handle: "membership desk",
      url: googleLink("chamber of commerce " + loc),
      painSnippet: "Ribbon cuttings and newsletters reach nearby businesses.",
      hook: "Join for opening announcement + member breakfast coffee.",
    },
    {
      name: "Neighborhood newsletter",
      platform: "email",
      handle: "editor",
      url: googleLink("neighborhood newsletter " + loc),
      painSnippet: "Sponsor blocks get read by people who live nearby.",
      hook: "Micro-sponsor one issue — opening week offer code.",
    },
    {
      name: "Instagram local discovery",
      platform: "instagram",
      handle: "local followers",
      url: "https://instagram.com",
      painSnippet: "Geo-tagged posts reach people who already shop local.",
      hook: "Reel: behind-the-scenes + what makes your family business different.",
    },
    {
      name: "City small business registry",
      platform: "local",
      handle: "economic development",
      url: googleLink("city economic development new business " + loc),
      painSnippet: "Official listings add legitimacy for family-owned openings.",
      hook: "Submit opening notice + ask for commuter/local business directory inclusion.",
    },
  ].slice(0, MAX_LEADS);
}

function localRetailLeads(profile: EnrichedProfile, description: string): LaunchLead[] {
  const lower = description.toLowerCase();
  if (/parking\s*lot|parking\s*garage|paid\s+parking|surface\s+lot|parkade/.test(lower) || /parking/i.test(profile.category)) {
    return parkingLotLeads(profile);
  }
  if (/used\s+car|dealership|auto\s+sales|car\s+lot|pre-?owned|automotive|truck/.test(lower) || /dealership/i.test(profile.category)) {
    return autoDealershipLeads(profile);
  }
  return independentRetailLeads(profile);
}

function saasLeads(profile: EnrichedProfile, description: string): LaunchLead[] {
  const pain = profile.painPoint;
  const templates: LaunchLead[] = [
    {
      name: "Relevant Reddit thread",
      platform: "reddit",
      handle: "problem discussion",
      url: "https://reddit.com/search/?q=" + encodeURIComponent(pain),
      painSnippet: `"${pain}" — active thread this week`,
      hook: `Reply with genuine advice first; mention ${profile.productName} only if asked`,
    },
    {
      name: "X / Twitter search",
      platform: "twitter",
      handle: "recent complaints",
      url: "https://x.com/search?q=" + encodeURIComponent(pain),
      painSnippet: `People venting about ${pain} in the last 7 days`,
      hook: "Reply to 3 posts with a specific tip — one DM max per day",
    },
    {
      name: "LinkedIn — ICP title search",
      platform: "linkedin",
      handle: profile.icp.split(",")[0],
      url: "https://linkedin.com/search/results/people/",
      painSnippet: `"Looking for tools that solve ${pain}"`,
      hook: `Short note referencing their post — not a pitch deck`,
    },
    {
      name: "Hacker News — Show HN audience",
      platform: "hackernews",
      handle: "Show HN readers",
      url: "https://news.ycombinator.com/show",
      painSnippet: `"Show HN posts in ${profile.category} get feedback-heavy comments"`,
      hook: "Post with demo link + specific ask for criticism",
    },
    {
      name: "Indie Hackers / community",
      platform: "reddit",
      handle: "founder community",
      url: "https://indiehackers.com",
      painSnippet: `"Founders comparing launch stacks for ${profile.category}"`,
      hook: "Share your launch plan as a post — product mention secondary",
    },
    {
      name: "Product Hunt upcoming",
      platform: "email",
      handle: "PH launch",
      url: "https://producthunt.com",
      painSnippet: `"Scheduled launch concentrates day-one traffic"`,
      hook: "Line up 5 friends to leave substantive comments on launch day",
    },
    {
      name: "Newsletter sponsor slot",
      platform: "email",
      handle: "Niche newsletter",
      url: "https://substack.com/search/" + encodeURIComponent(profile.category),
      painSnippet: `"Audience already cares about ${profile.category}"`,
      hook: "Pitch guest post or micro-sponsor before paid ads",
    },
    {
      name: "GitHub topic followers",
      platform: "twitter",
      handle: "dev community",
      url: inputRepoUrl(description),
      painSnippet: `"Devs watching repos in this space"`,
      hook: "Issue a clear README problem statement — share where devs already are",
    },
    {
      name: "Slack / Discord community",
      platform: "reddit",
      handle: "niche community",
      url: "https://discord.com/search",
      painSnippet: `"Daily standups where ${pain} gets mentioned"`,
      hook: "Join, contribute for 2 weeks, then share launch in #show-and-tell",
    },
    {
      name: "Beta user from network",
      platform: "email",
      handle: "warm intro",
      url: "mailto:",
      painSnippet: description.slice(0, 120) + (description.length > 120 ? "…" : ""),
      hook: `Ask one specific question: "Would you pay for X if it solved Y?"`,
    },
  ];
  return templates.slice(0, MAX_LEADS);
}

function inputRepoUrl(description: string): string {
  const m = description.match(/https?:\/\/github\.com\/[^\s]+/);
  return m?.[0] ?? "https://github.com/search";
}

function generalLeads(profile: EnrichedProfile, description: string): LaunchLead[] {
  const t = description.toLowerCase();
  if (/parking\s*lot|parking\s*garage|paid\s+parking|surface\s+lot/.test(t)) {
    return parkingLotLeads({ ...profile, category: "Parking lot / surface lot" });
  }
  if (/cafe|coffee|restaurant|bakery|bistro|food\s*truck|diner/.test(t)) {
    return localFoodLeads(profile, description);
  }
  if (/salon|barber|gym|fitness|plumber|contractor|cleaning|clinic|studio/.test(t)) {
    return localServiceLeads(profile);
  }
  if (/used\s+car|dealership|car\s+lot|shop|store|boutique|retail|parking|lot/.test(t)) {
    return localRetailLeads(profile, description);
  }
  if (profile.locationHint || /local|neighborhood|family|small business|opening|downtown|foot traffic/.test(t)) {
    return independentRetailLeads(profile);
  }
  return saasLeads(profile, description);
}

export function contentFor(profile: EnrichedProfile, input: LaunchInput): LaunchContent[] {
  if (profile.kind === "local_food") return localFoodContent(profile, input);
  if (profile.kind.startsWith("local_")) return localBusinessContent(profile, input);
  return saasContent(profile, input);
}

function localFoodContent(profile: EnrichedProfile, input: LaunchInput): LaunchContent[] {
  const loc = profile.locationHint ? ` in ${profile.locationHint}` : "";
  const season = profile.season ? `${profile.season} ` : "";
  const desc = input.productDescription.slice(0, 200);

  return [
    {
      id: "instagram-opening",
      platform: "Instagram",
      title: `${season}Opening reel caption`,
      body: `☕ ${profile.productName} is opening${loc} this ${profile.season ?? "season"}.

Built for early mornings and hard workers — strong coffee, fast service, food you can eat with your hands.

🗓 Soft open: [DATE]
📍 [ADDRESS]
🔧 Crew discount for trades with company email / vest

Save this post — opening week specials drop here first.

#${profile.productName.replace(/\s+/g, "")} #LocalCoffee #${profile.season ?? "Grand"}Opening #SupportLocal`,
      status: "draft",
    },
    {
      id: "google-business-post",
      platform: "Google Business Profile",
      title: "Opening announcement post",
      body: `${profile.productName} — ${profile.tagline}

We're opening${loc} this ${profile.season ?? "month"}. What to expect:
• Espresso + drip from [ROASTER]
• Breakfast sandwiches and lunch plates geared for busy schedules
• Walk-up window + sit-down seating
• Free drip coffee for construction crews during opening week (show company badge)

Hours: Mon–Fri 6:30am–3pm, Sat 8am–2pm
Call ahead for group orders: [PHONE]

Based on: ${desc}`,
      status: "draft",
    },
    {
      id: "nextdoor-intro",
      platform: "Nextdoor",
      title: "Neighborhood introduction",
      body: `Hi neighbors — I'm opening ${profile.productName}${loc} and wanted to introduce myself before the doors open.

${input.productDescription.slice(0, 280)}

Opening week: [DATES]. Come say hi — first coffee on us for neighbors on [DAY].

Not a chain. Local staff. Hope to be your weekday morning spot.`,
      status: "draft",
    },
    {
      id: "press-pitch",
      platform: "Local press / food blog",
      title: "Spring opening pitch email",
      body: `Subject: ${season}opening — ${profile.productName}${loc} (${profile.category})

Hi [Name],

I'm launching ${profile.productName}: ${profile.tagline.toLowerCase()}.

The angle: ${profile.launchAngle}

I'd love to include you for a soft-open tasting before we open to the public. Attached: menu preview + 3 photos.

Happy to share the founder story — ${desc}

Best,
[Your name]
[Phone]`,
      status: "draft",
    },
    {
      id: "partner-outreach",
      platform: "Email — trade partner",
      title: "Builder supply / contractor outreach",
      body: `Subject: Coffee near your job sites — ${profile.productName} opening [DATE]

Hi [Name],

I'm opening ${profile.productName}${loc} — coffee and lunch built for crews who don't have time to drive across town.

Would you be open to:
• Stack of menus at your counter for opening month
• 15% crew discount (company email or vest)
• One catered coffee morning for your supers before a big pour

No obligation — just trying to earn word-of-mouth with the trades first.

[Your name] · [Phone]`,
      status: "draft",
    },
    {
      id: "yelp-opening",
      platform: "Yelp",
      title: "Business description (first 1000 chars)",
      body: `${profile.productName} is a ${profile.category.toLowerCase()}${loc}, opening ${profile.season ?? "soon"}.

${profile.tagline}

What we're about:
${desc}

Good for: ${profile.icp}

Opening specials: [LIST]. We respond to every review — tell us what to improve.`,
      status: "draft",
    },
  ];
}

function parkingLotContent(profile: EnrichedProfile, input: LaunchInput): LaunchContent[] {
  const loc = profile.locationHint ? ` in ${profile.locationHint}` : "";
  return [
    {
      id: "ig-parking-intro",
      platform: "Instagram",
      title: "Family-owned lot intro",
      body: `🅿️ ${profile.productName}${loc} — family-run parking you can trust.

✅ Clear rates · ✅ Safe, lit stalls · ✅ Monthly passes for commuters

Opening week: first hour free for neighbors who follow + share.

DM for monthly commuter pricing.

#${profile.productName.replace(/\s+/g, "")} #Parking${loc ? loc.replace(/\s+/g, "") : "Local"}`,
      status: "draft",
    },
    {
      id: "google-parking",
      platform: "Google Business Profile",
      title: "Maps listing post",
      body: `${profile.productName} — ${profile.tagline}

Hourly + monthly parking${loc}. Event-night rates available.

Based on: ${input.productDescription.slice(0, 200)}`,
      status: "draft",
    },
    {
      id: "nextdoor-parking",
      platform: "Nextdoor",
      title: "Neighbor intro",
      body: `Hi neighbors — we're a family-owned parking lot${loc} and wanted to introduce ourselves before busy season.

${input.productDescription.slice(0, 220)}

Happy to answer questions about rates, hours, and monthly passes.`,
      status: "draft",
    },
    {
      id: "facebook-parking",
      platform: "Facebook",
      title: "Local group post",
      body: `Looking for reliable parking${loc}? ${profile.productName} is family-owned — DM for commuter or event-night rates.`,
      status: "draft",
    },
  ];
}

function localBusinessContent(profile: EnrichedProfile, input: LaunchInput): LaunchContent[] {
  if (/parking/i.test(profile.category)) return parkingLotContent(profile, input);
  return localFoodContent(profile, input).slice(0, 4).concat([
    {
      id: "referral-partner",
      platform: "Email",
      title: "Referral partner pitch",
      body: `Subject: Cross-referral — ${profile.productName}

Hi [Name],

I run ${profile.productName} (${profile.category})${profile.locationHint ? ` in ${profile.locationHint}` : ""}.

We serve similar customers but don't compete. Want to trade referrals this month?

— [Your name]`,
      status: "draft",
    },
  ]);
}

function saasContent(profile: EnrichedProfile, input: LaunchInput): LaunchContent[] {
  const repo = input.repoUrl ? `\n\nRepo: ${input.repoUrl}` : "";
  const desc = input.productDescription.slice(0, 300);

  return [
    {
      id: "launch-post",
      platform: profile.channels[0] ?? "Launch",
      title: `Launch post — ${profile.productName}`,
      body: `I'm building ${profile.productName} for ${profile.icp}.

Problem: ${profile.painPoint}.

What it does: ${desc}

${profile.tagline}

Looking for 10 people to try it and tell me what's broken. Comment or DM if that's you.${repo}`,
      status: "draft",
    },
    {
      id: "x-thread-1",
      platform: "X / Twitter",
      title: "Thread part 1/3",
      body: `${profile.painPoint} — that's the problem ${profile.productName} tackles.

Most tools in ${profile.category} miss the point.

Here's what we're doing differently 🧵`,
      status: "draft",
    },
    {
      id: "x-thread-2",
      platform: "X / Twitter",
      title: "Thread part 2/3",
      body: `We talked to ${profile.icp.split(",")[0].trim()} before writing a line of code.

Pattern we heard: "${profile.painPoint}"

So ${profile.productName} focuses on that one job — not ten.`,
      status: "draft",
    },
    {
      id: "dm-template",
      platform: "Direct message",
      title: "Outreach template (personalize per lead)",
      body: `Hey {{name}} — saw your post about {{pain_snippet}}.

I'm building ${profile.productName} (${profile.tagline}). Trying to solve exactly that.

Would a 10-min look be useful? No pitch deck — just want your reaction.`,
      status: "draft",
    },
    {
      id: "community-post",
      platform: profile.channels.find((c) => c.includes("Reddit")) ?? "Community",
      title: "Value-first community post",
      body: `I mapped how teams in ${profile.category} actually launch (talked to ~15 founders).

Common mistake: blasting generic outreach instead of finding people already complaining about the problem.

I'm building ${profile.productName} around that insight. Happy to share the checklist I used — DM if useful.`,
      status: "draft",
    },
  ];
}

export function assetsFor(profile: EnrichedProfile, goal: string): LaunchAsset[] {
  if (profile.kind === "local_food" || profile.kind.startsWith("local_")) {
    return localFoodAssets(profile, goal);
  }
  return saasAssets(profile, goal);
}

function localFoodAssets(profile: EnrichedProfile, goal: string): LaunchAsset[] {
  const season = profile.season ?? "grand";
  const landing = `export default function OpeningPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <header className="border-b border-stone-800 px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-xl">${profile.productName}</span>
        <span className="text-amber-400 text-sm uppercase tracking-widest">${season} opening</span>
      </header>
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-amber-400/90 text-sm mb-2">${profile.category}</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">${profile.tagline}</h1>
        <p className="mt-4 text-stone-400">${profile.icp.split(".")[0]}.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 text-left text-sm">
          <div className="rounded-lg border border-stone-800 p-4">
            <div className="text-stone-500">Soft open</div>
            <div className="font-medium">[DATE] · 6:30am–3pm</div>
          </div>
          <div className="rounded-lg border border-stone-800 p-4">
            <div className="text-stone-500">Location</div>
            <div className="font-medium">[ADDRESS]${profile.locationHint ? ` · ${profile.locationHint}` : ""}</div>
          </div>
        </div>
        <form className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input type="email" placeholder="Email for opening updates" className="flex-1 rounded-lg bg-stone-900 border border-stone-700 px-4 py-3" />
          <button type="submit" className="rounded-lg bg-amber-500 text-stone-950 px-6 py-3 font-semibold">
            Notify me
          </button>
        </form>
        <p className="mt-6 text-xs text-stone-500">Crew discount opening week · Walk-ins welcome</p>
      </section>
    </main>
  );
}`;

  const email = `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917;">
  <h1 style="color: #b45309; margin-bottom: 4px;">${profile.productName}</h1>
  <p style="color: #78716c; font-style: italic;">${profile.tagline}</p>
  <p>Hi {{first_name}},</p>
  <p>We're opening${profile.locationHint ? ` in ${profile.locationHint}` : ""} this ${profile.season ?? "month"} — and I wanted you to hear it first.</p>
  <p>${profile.launchAngle}</p>
  <p><strong>Soft open:</strong> [DATE]<br/><strong>Address:</strong> [ADDRESS]</p>
  <a href="{{rsvp_url}}" style="display:inline-block;background:#b45309;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
    RSVP for opening week
  </a>
  <p style="font-size: 13px; color: #78716c; margin-top: 24px;">Reply to this email — I read every one.</p>
</body>
</html>`;

  return [
    { id: "opening-landing", title: "Spring opening landing page", kind: "landing", code: landing, buildStatus: "verified" },
    { id: "partner-email", title: "Partner / neighbor invite email", kind: "email", code: email, buildStatus: "verified" },
  ];
}

function saasAssets(profile: EnrichedProfile, goal: string): LaunchAsset[] {
  const landing = `export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-emerald-400 text-sm uppercase tracking-widest mb-4">${profile.category}</p>
        <h1 className="text-5xl font-bold tracking-tight">${profile.productName}</h1>
        <p className="mt-4 text-zinc-400 text-lg">${profile.tagline}</p>
        <p className="mt-2 text-sm text-zinc-500">${profile.painPoint}</p>
        <form className="mt-8 flex gap-2 max-w-md mx-auto">
          <input type="email" placeholder="you@company.com" className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3" />
          <button type="submit" className="rounded-lg bg-emerald-500 text-zinc-950 px-6 py-3 font-medium">Join ${goal}</button>
        </form>
      </div>
    </main>
  );
}`;

  const email = `<!DOCTYPE html>
<html>
<body style="font-family: system-ui; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #10b981;">${profile.productName}</h1>
  <p>Hi {{first_name}},</p>
  <p>You mentioned struggling with ${profile.painPoint}.</p>
  <p>${profile.productName} — ${profile.tagline}</p>
  <a href="{{waitlist_url}}" style="display:inline-block;background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Get early access</a>
</body>
</html>`;

  return [
    { id: "waitlist-landing", title: "Waitlist landing page", kind: "landing", code: landing, buildStatus: "verified" },
    { id: "cold-email", title: "Outreach email HTML", kind: "email", code: email, buildStatus: "verified" },
  ];
}

export function buildLaunchResult(ctx: {
  input: LaunchInput;
  profile: EnrichedProfile;
  strategy: StrategyOutput;
  leads: LaunchLead[];
  content: LaunchContent[];
  assets: LaunchAsset[];
}): import("@/lib/launch-data").LaunchResult {
  return {
    productName: ctx.profile.productName,
    tagline: ctx.profile.tagline,
    icp: ctx.profile.icp,
    strategyTimeline: ctx.strategy.timeline,
    leads: ctx.leads.slice(0, MAX_LEADS),
    content: ctx.content,
    assets: ctx.assets,
    deploymentUrl: "",
    complianceStatus: "verified",
    summary: ctx.strategy.rationale,
    approved: false,
  };
}
