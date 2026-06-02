# AdVantage

**Marketing team at your fingertips.**

Built for the [NEAR AI Agents That Act Hackathon](https://github.com/arora13/AdVantageV1).

### 🏆 1st Place — Online Track

**Voted by judges as the best project from a remote contestant.**

## Mission

Most small businesses and solo founders can't afford a marketing team — so they guess. AdVantage changes that. Powered by a multi-agent swarm, AdVantage gives any business instant access to a professional-grade marketing team on demand. Describe your product and your audience, and AdVantage's specialized agents handle everything — market research, brand strategy, content creation, campaign planning, and competitor analysis — delivering in minutes what an agency would charge thousands for and take weeks to produce.

## Demo video

Watch the full walkthrough: [AdVantage demo on Loom](https://www.loom.com/share/f7d68bbbc65240b887d0e3bf07d367b6)

Paste a product or business idea, and a **5-agent swarm** researches your market, finds **10 high-intent contacts**, writes platform-specific launch copy, builds landing assets, and stages everything in a **marketing dashboard** — you approve posts, copy assets, and mark what you've published.

Works for **local businesses** (cafes, studios, retail, parking lots) and **SaaS** — not one hardcoded vertical.

---

## Demo flow

1. **Intro** — scroll from hero into the launch tool (`/#tool`)
2. **Describe** your business (10+ characters) and click **Build marketing dashboard**
3. **Watch** the live 5-agent pipeline on `/analyze`
4. **Review** on `/dashboard` — approve/dismiss post ideas, copy assets, contacts, 30-day plan
5. **Approve & Launch pack** when ready

`/results` redirects to `/dashboard`.

---

## Agent swarm

| Agent | Role | What it does |
|-------|------|----------------|
| **CMO** | Claude | 30-day GTM plan, ICP, channel mix |
| **Lead Hunter** | Apify + Claude | Up to 10 targeted contacts with live web signals when Apify is configured |
| **Content Engine** | Claude | Instagram, HN, X, email — matched to your business type |
| **Asset Builder** | Claude + Daytona | React/Tailwind landing page; Daytona verifies code in a sandbox |
| **Deploy Orchestrator** | In-app | Stages launch pack in memory for your dashboard |

Agents run **sequentially** with live stream lines polled from the server — not a fake progress animation.

---

## Marketing dashboard

- **Recommendations** — AI post ideas; dismiss removes them from your queue
- **Approved** — copy caption → post on your channel → **Mark as done**
- **Published** — posts you've marked complete
- **Contacts** — partners, communities, buyers to reach
- **30-day plan** — channel actions by day
- **Assets** — landing page + email HTML (copy code)
- **Approve & Launch pack** — records approval in session

---

## Tests

```bash
npm test                 # full suite
npm run test:e2e         # orchestrator swarm
npm run test:api         # /api/launch/* routes
npm run test:verticals   # cafe + SaaS + local service
npm run check:ai         # AI smoke test
npm run test:sponsors    # Apify + Daytona
```

---

## Stack

- **Frontend:** TanStack Start, React, Tailwind  
- **API:** JSON routes (`/api/launch/start`, `/progress`, `/result`, `/approve`, `/ai-status`)  
- **AI:** Claude  
- **Sponsors:** Apify (leads), Daytona (asset verify)  
- **Runtime:** In-memory launches (no external DB required)

---

## Sponsor integrations

Only integrations with API keys in `.env` are used at runtime (shown on the landing page under **Active integrations**):

| Integration | Env var | Agent |
|-------------|---------|-------|
| Apify | `APIFY_API_TOKEN` | Lead Hunter |
| Daytona | `DAYTONA_API_KEY` | Asset Builder |

---

## Project structure

```
src/
  components/launch/     # hero, form, marketing-dashboard
  lib/gtm/               # agent swarm, AI, sponsors (Apify, Daytona)
  lib/ai-config.server.ts
  routes/                # /, /analyze, /dashboard
scripts/                 # E2E tests, check:ai, test:sponsors
```

---

## License

MIT — hackathon submission for NEAR AI Agents That Act.
