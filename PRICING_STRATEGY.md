# AKAI Pricing Strategy
_Analysis & Recommendations — March 2026_

---

## Executive Summary

AKAI's current pricing is directionally correct but under-optimised. The structure is clean, margins are excellent (94–99%), and the "replaces staff" framing is on-point. Key opportunities: extend trial to 14 days, add annual billing immediately, add a voice fair-use policy, and plan a 20–25% price increase once 50+ case studies exist.

---

## 1. Pricing Structure Analysis

### Current jumps: $147 → $497 → $1,497

| Jump | Multiplier | Agent delta | Assessment |
|------|-----------|-------------|------------|
| Starter → Growth | 3.38× | 1 → 3 agents | Steep but defensible — 3 agents + team seats + onboarding call |
| Growth → Scale | 3.01× | 3 → 10 agents | Clean 3× pattern, easy to communicate |

**Verdict: The ladder is psychologically sound.** Each tier follows the "3× value, 3× price" rule which is well-studied in SaaS. The pattern is consistent and easy to justify in sales conversations.

### Psychological analysis of the numbers

- **$147** — Charm price in the "$X47" family (used heavily in info products). Not a classic SaaS price point ($149 or $99 would be more familiar). Slightly unusual = slightly memorable. Works.
- **$497** — Classic "just under $500" anchor. Very strong. This is a Goldilocks number — high enough to signal serious software, low enough to avoid procurement processes. **Keep this.**
- **$1,497** — "Just under $1,500" anchor. Effective. Signals enterprise-adjacent without triggering full enterprise sales cycles. **Keep this.**

### Should there be a $297 tier?

**Answer: Not yet — but keep it in the back pocket.**

Arguments for:
- Reduces friction for "I need more than 1 agent but $497 feels big"
- $297 is a proven SaaS price point (GoHighLevel's top tier)
- 2× jump from $147 is easier to swallow

Arguments against:
- Adds decision fatigue (4 tiers is one too many for a landing page)
- The current 3-tier grid is clean and converts well
- A $297 tier risks cannibalising Growth ($497) without adding revenue
- You'd need to define "2 agents" — which agents? Creates support complexity

**Recommendation:** Add $297 only when you see evidence of churn at Starter citing "can't afford Growth." Monitor this in Year 1. If it appears, launch a $297/2-agent "Pro" tier as a limited offer.

### Annual discount strategy

**Offer 2 months free (≈17% off) for annual billing.**

Why "2 months free" beats "17% off":
- Concrete and tangible — humans understand "free months" better than percentages
- Feels like a bigger gift even though the math is identical
- Widely used by Notion, Linear, Loom, etc.

**Recommended annual prices:**

| Plan | Monthly | Annual (÷12) | Effective monthly | Savings/yr |
|------|---------|--------------|-------------------|------------|
| Starter | $147/mo | $1,470/yr | $122.50/mo | $294 |
| Growth | $497/mo | $4,970/yr | $414/mo | $994 |
| Scale | $1,497/mo | $14,970/yr | $1,247/mo | $2,994 |

Note: Annual prices end in "70" — maintains the charm-price feel.

**Cash flow impact at 30% annual adoption:**
- 10 Growth customers on annual = $49,700 upfront vs $59,640 over 12 months
- Trade-off is worth it for early-stage cash and reduced churn risk

---

## 2. Usage-Based Elements

### Voice calls (Sophie via Bland.ai at ~$0.05/min)

**Yes, voice should be metered — but use a generous included quota, not a hard paywall.**

Fair use model:

| Plan | Included voice minutes | Overage rate |
|------|----------------------|-------------|
| Starter | 60 min/mo | $0.12/min |
| Growth | 300 min/mo | $0.10/min |
| Scale | 1,200 min/mo | $0.08/min |

**Rationale:**
- Included quota covers typical use (Starter: ~12 calls/mo × 5min avg; Growth: ~60 calls/mo)
- Overage at 2× cost provides 60% margin on each extra minute
- Volume discount on Scale rewards heavy users and reduces churn
- Never surprise users — show usage in dashboard in real-time

### Claude API usage fair use

| Plan | Included AI interactions/mo | Overage |
|------|---------------------------|---------|
| Starter | 1,000 | $0.05/100 interactions |
| Growth | 5,000 | $0.04/100 interactions |
| Scale | Unlimited | — |

_1 interaction ≈ one agent task/response cycle_

### Email sends

| Plan | Included sends/mo | Overage |
|------|------------------|---------|
| Starter | 5,000 emails | $1/1,000 |
| Growth | 25,000 emails | $0.80/1,000 |
| Scale | Unlimited | — |

### Overage design principles

1. **Never cut off service** — alert at 80% usage, degrade gracefully
2. **Pre-authorise overages** — ask users to confirm overage billing on signup (reduces support tickets)
3. **Dashboard visibility** — real-time meter is table stakes; users who can see usage don't complain about bills
4. **Cap option** — let users set a hard monthly overage cap (protects them, builds trust)

---

## 3. Trial Strategy

### Current: 7-day free trial

**Recommendation: Extend to 14 days immediately.**

B2B SaaS trial benchmark data:
- 7 days: Typical for consumer apps. Too short for business software where value realisation takes days of setup + use.
- 14 days: The SaaS sweet spot. Used by Slack, Intercom, Notion, HubSpot starter. Long enough to see value, short enough to maintain urgency.
- 30 days: Reduces urgency. Users "defer" conversion. Extends sales cycle without improving conversion rate in most B2B studies.
- Freemium: Works at massive scale (millions of users) with simple onboarding. AKAI is complex — freemium would create support burden without conversion benefit at this stage.

**14 days is the right call for AKAI right now.**

### Optimal conversion triggers

Conversion doesn't happen on day 14 — it happens when the user has an "aha moment." Design your trial to manufacture these:

1. **Activation gate (Day 1–2):** Onboarding wizard → first agent live. Completion = 80%+ conversion predictor.
2. **First result (Day 3–5):** First automated email sent, first lead captured, or first voice call made. Show this explicitly in dashboard. "Sophie just booked a call for you" = money moment.
3. **ROI summary email (Day 10):** "In 10 days, AKAI has saved you an estimated X hours / sent X emails / booked X calls. Keep it running — 4 days left."
4. **Urgency nudge (Day 13):** In-app banner + email. Not annoying — honest: "Tomorrow is your last day. Don't lose your automations."
5. **White-glove offer:** Offer a 30-min onboarding call during trial. Booked calls convert at 3–5× the baseline. Make it available but not mandatory.

**Bonus:** Consider a "trial extension" mechanic — users who invite a teammate get +7 days. Drives referrals and extends engagement.

---

## 4. Price Increase Roadmap

### Principle: Never surprise existing customers.

| Phase | Trigger | Action | Timeline |
|-------|---------|--------|----------|
| **Now** | Launch | Current pricing stays. Collect case studies aggressively. | March–August 2026 |
| **Price freeze lift** | 50+ paying customers + 3 published case studies with $ ROI | Announce new pricing for new customers. Email existing: "You're grandfathered at your current price forever." | Q3 2026 (Aug–Sep) |
| **New prices** | As above | Starter $197, Growth $597, Scale $1,797 (+~25%) | Q3 2026 |
| **Annual retrospective** | 1 year in | Review pricing vs. COGS, competitor moves, churn data. Adjust. | March 2027 |

### Recommended new prices (Q3 2026)

| Plan | Current | New (+25%) | Annual (2mo free) |
|------|---------|-----------|-------------------|
| Starter | $147 | $197 | $1,970/yr ($164/mo) |
| Growth | $497 | $597 | $5,970/yr ($497/mo) |
| Scale | $1,497 | $1,797 | $17,970/yr ($1,497/mo) |

Note: Growth annual at $497/mo (same as current monthly) is a great anchor: "Lock in today's Growth price forever with annual billing."

### Grandfather execution

- Email subject: "Your AKAI price is locked — forever."
- Body: Announce new prices, explain existing customers are exempt, provide a 90-day window to upgrade tiers at old pricing
- Legal: Add "price lock for life of subscription (no break in service)" to terms
- This creates loyalty, reduces churn, and generates positive word-of-mouth

---

## 5. Competitor Price Anchoring

### The landscape

| Product | Price | What you get | What you don't get |
|---------|-------|-------------|-------------------|
| GoHighLevel | $97–$297/mo | CRM + marketing automation | Requires agency/expert to configure. Not AI-native. |
| HubSpot Starter | $20/user/mo → $800+/mo | CRM, email, some automations | Enterprise pricing for enterprise complexity. No AI agents. |
| AKAI Growth | $497/mo | 3 fully autonomous AI agents | N/A |

### Positioning copy

**vs. GoHighLevel:**
> "GoHighLevel gives you the tools. AKAI runs the business. GHL costs $297/mo plus $2,000+/mo in agency fees to configure and manage. AKAI runs itself — no agency needed."

**vs. HubSpot:**
> "HubSpot charges $800+/month and still needs a marketing team to run it. AKAI is $497/month and IS your marketing team."

**vs. hiring:**
> "You're not buying software. You're replacing payroll."

### Where AKAI sits in the market

AKAI is priced ABOVE traditional CRM/automation tools (GHL, HubSpot) and BELOW enterprise AI platforms (Salesforce Einstein, Microsoft Copilot). This is the right place — premium enough to signal real value, accessible enough to close without procurement cycles.

**Key message:** The comparison isn't "AKAI vs. software." It's "AKAI vs. headcount."

---

## 6. "Replaces Staff" Framing — Validation

### Current framing audit

| Claim | Actual market rate (AU/US) | Verdict |
|-------|--------------------------|---------|
| Replaces a part-time VA (~$1,500/mo) | AU: $25–35/hr × 20hrs = $2,000–2,800/mo. US: $15–25/hr × 20hrs = $1,200–2,000/mo. | ✅ Conservative and believable. Could go higher. |
| Replaces marketing + sales + VA (~$8,500/mo) | Marketing coordinator AU: $65k/yr = $5,400/mo. Sales rep AU: $75k/yr = $6,250/mo. VA: $2,000/mo. Total: $13,650/mo. | ✅ Very conservative. Actual is far higher. Could say $12,000/mo+ credibly. |
| Replaces entire ops team (~$25k+/mo) | GM + Sales + Marketing + Admin: $150k + $80k + $70k + $55k = $355k/yr = $29,600/mo. | ✅ Accurate. $25k+ is modest. |

**All three claims are defensible and conservative.** This is important — conservative ROI claims build more trust than inflated ones.

### Stronger ROI framing

**Current:** "Replaces marketing + sales + VA (~$8,500/mo)"

**Stronger version:**
> "Replaces: Marketing coordinator ($5,400/mo) + Sales rep ($6,250/mo) + VA ($2,000/mo) = $13,650/mo in payroll. You pay $497."

**Or, simpler and punchier:**
> "27× ROI at Growth. Every month."

**Formula:** $13,650 replaced / $497 price = 27.5× ROI. Lead with this number.

**Even stronger — specificity builds credibility:**
> "At Growth: Sophie handles all inbound sales calls 24/7. Email Guard manages your inbox. Social Agent publishes 3× weekly. That's a sales rep + EA + marketing coordinator — for $497/mo."

### ROI table for pricing page

Consider adding a "Compare the cost" section:

| What AKAI replaces | Cost to hire | AKAI plan |
|-------------------|-------------|-----------|
| 1 part-time VA | ~$2,000/mo | Starter: $147/mo |
| Sales + Marketing + VA | ~$13,500/mo | Growth: $497/mo |
| Full ops team (5 roles) | ~$30,000/mo | Scale: $1,497/mo |

---

## 7. Final Recommended Pricing Structure

### Recommended immediate structure (this week)

**No structural changes needed** — the tiers are solid. Focus on:

1. **Add annual billing toggle** — "Monthly / Annual (Save 2 months)" 
2. **Extend trial to 14 days** — change all copy from "7-day" to "14-day"
3. **Strengthen ROI framing** — add the 27× number to Growth, be specific about roles
4. **Add fair use note** — "Includes 300 voice mins/mo + 25k emails + 5k AI interactions"

### Pricing (keep current, update copy)

| Plan | Price | Annual | Agents | ROI Framing |
|------|-------|--------|--------|-------------|
| Starter | $147/mo | $1,470/yr | 1 | "13× ROI vs. part-time VA" |
| Growth | $497/mo | $4,970/yr | 3 | "27× ROI vs. hiring 3 roles" |
| Scale | $1,497/mo | $14,970/yr | 10 | "20× ROI vs. full ops team" |
| Enterprise | Custom | Custom | All | Custom |

### Quick wins to implement this week

**Priority 1 (today):**
- [ ] Change "7-day free trial" → "14-day free trial" everywhere
- [ ] Add "or $X,XXX/yr — save 2 months" under each price

**Priority 2 (this week):**
- [ ] Add ROI multiplier to each plan (13×, 27×, 20×)
- [ ] Add specific role names to Growth framing: "Sales rep + Marketing + VA"
- [ ] Add "Annual / Monthly" toggle to pricing page

**Priority 3 (next sprint):**
- [ ] Implement actual annual billing in Stripe
- [ ] Add usage meter to dashboard (voice mins, email sends)
- [ ] Add fair use policy page

### Price increase schedule

- **Now → August 2026:** Current prices. Gather proof points.
- **September 2026:** New customer prices: $197 / $597 / $1,797
- **March 2027:** Annual review.

---

## Appendix: Voice Usage Economics

At $0.05/min (Bland.ai), a Growth customer making 300 calls/mo × 4 min avg = 1,200 minutes = $60/mo in COGS on voice alone. This would reduce margins from 94% to ~82% on that customer. The fair use model (300 min included at Growth) limits exposure while covering 95%+ of real-world use cases.

---

_Document owner: AKAI — getakai.ai_
_Next review: September 2026 (pre-price-increase)_
