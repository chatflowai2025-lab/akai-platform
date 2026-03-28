# AKAI Financial Model
*Generated 2026-03-28*

## Assumptions
- Starter: $147/mo | Growth: $497/mo | Scale: $1,497/mo | Enterprise: $5,000/mo
- Variable cost: $5/user/mo average (Claude API + Bland.ai + Firebase + Resend)
- Fixed infra: $50/mo (Railway + Vercel) — flat to ~500 users
- Monthly churn: 5% (20-month avg customer lifetime)
- No team hires modelled — Aaron solo

---

## 1. 24-Month MRR Projections

### Conservative (2 new customers/mo · 70% Growth $497, 30% Starter $147)
Avg new customer value: (0.7 × $497) + (0.3 × $147) = $392/mo

| Month | New Cust | Total Cust | MRR |
|---|---|---|---|
| 1 | 2 | 2 | $784 |
| 3 | 2 | 6 | $2,034 (after churn) |
| 6 | 2 | 10 | $3,920 |
| 9 | 2 | 14 | $5,488 |
| 12 | 2 | 18 | $7,056 |
| 18 | 2 | 24 | $9,408 |
| 24 | 2 | 29 | $11,368 |

*Note: steady-state customers = 2/0.05 = 40. Approaches ~$15,680 at infinity.*

### Base (5 new customers/mo · 70% Growth, 20% Starter, 10% Scale)
Avg new customer value: (0.7 × $497) + (0.2 × $147) + (0.1 × $1,497) = $527/mo

| Month | New Cust | Total Cust | MRR |
|---|---|---|---|
| 1 | 5 | 5 | $2,635 |
| 3 | 5 | 14 | $7,378 |
| 6 | 5 | 24 | $12,648 |
| 9 | 5 | 33 | $17,391 |
| 12 | 5 | 40 | $21,080 |
| 18 | 5 | 51 | $26,877 |
| 24 | 5 | 58 | $30,566 |

*Steady-state: 100 customers × $527 = $52,700 MRR*

### Aggressive (15 new customers/mo · 50% Growth, 25% Starter, 20% Scale, 5% Enterprise)
Avg new customer value: (0.5 × $497) + (0.25 × $147) + (0.2 × $1,497) + (0.05 × $5,000) = $834/mo

| Month | New Cust | Total Cust | MRR |
|---|---|---|---|
| 1 | 15 | 15 | $12,510 |
| 3 | 15 | 41 | $34,194 |
| 6 | 15 | 69 | $57,546 |
| 9 | 15 | 88 | $73,392 |
| 12 | 15 | 102 | $85,068 |
| 18 | 15 | 116 | $96,744 |
| 24 | 15 | 120 | $100,080 |

*Steady-state: 300 customers × $834 = $250,200 MRR*

---

## 2. Break-Even Milestones

| MRR Target | Conservative | Base | Aggressive |
|---|---|---|---|
| **$10k** | Month 26 | Month 13 | Month 2 |
| **$25k** | Never (steady-state $15.7k) | Month 24+ | Month 4 |
| **$50k** | Never | Steady-state only | Month 6 |
| **$100k** | Never | Never | Month 22 |

**Aaron's $10k/mo personal target:**
- Conservative: ~Month 26 (too slow — need more than 2 customers/mo)
- Base: Month 13 ✅
- Aggressive: Month 2 ✅

---

## 3. Gross Margin by Tier

| Tier | Price | Variable Cost | Gross Profit | Gross Margin |
|---|---|---|---|---|
| Starter | $147 | $5 | $142 | **96.6%** |
| Growth | $497 | $7 | $490 | **98.6%** |
| Scale | $1,497 | $12 | $1,485 | **99.2%** |
| Enterprise | $5,000 | $25 | $4,975 | **99.5%** |

*Fixed infra allocated: at 50 users = $1/user/mo (negligible)*

---

## 4. LTV / CAC Analysis

*LTV = avg monthly revenue × avg customer lifetime (20 months)*

| Tier | Monthly Rev | LTV (20mo) | Max CAC (3:1) | Max CAC (5:1) |
|---|---|---|---|---|
| Starter | $147 | $2,940 | $980 | $588 |
| Growth | $497 | $9,940 | $3,313 | $1,988 |
| Scale | $1,497 | $29,940 | $9,980 | $5,988 |
| Enterprise | $5,000 | $100,000 | $33,333 | $20,000 |

**Blended LTV (base mix):** ~$10,540 per customer
**Max CAC at 3:1:** ~$3,513 — AKAI can afford aggressive paid acquisition at this LTV

---

## 5. Path to $1M ARR ($83,333 MRR)

**Fastest route — Growth-heavy + Scale anchor:**

| Tier | Customers Needed | MRR Contribution |
|---|---|---|
| Scale ($1,497) | 20 | $29,940 |
| Growth ($497) | 80 | $39,760 |
| Starter ($147) | 30 | $4,410 |
| Enterprise ($5k) | 2 | $10,000 |
| **Total** | **132 customers** | **$84,110** |

**132 customers at $1M ARR.** At 5 new customers/mo (base), that's 26+ months.
At 15/mo (aggressive), that's Month 12.

The lever: convert 5 Starter → Growth and 2 Growth → Scale per month. Upsell beats acquisition.

---

## 6. Voice Usage Risk (Bland.ai)

*Base voice cost: 50 calls × 2min × $0.05/min = $5/user/mo*
*Heavy voice cost: 200 calls × 2min × $0.05/min = $20/user/mo*

| Scenario | Base Cost | Voice Add | Total Variable | Margin (Growth $497) |
|---|---|---|---|---|
| No voice use | $5 | $0 | $5 | 99.0% |
| Normal (50 calls/mo) | $5 | $5 | $10 | 98.0% |
| Heavy (200 calls/mo) | $5 | $20 | $25 | 95.0% |
| Extreme (500 calls/mo) | $5 | $50 | $55 | 88.9% |

**Verdict:** Even at 200 calls/mo, margin stays above 95%. Only extreme abuse (500+ calls) starts to bite. A soft cap of 200 Sophie calls/mo on Growth is prudent — add overages at $0.10/call beyond that.

---

## 7. Pricing Sensitivity

| Change | Current MRR (Base, Mo 12) | New MRR | Δ |
|---|---|---|---|
| Raise Starter $147→$197 | $21,080 | +$500 (blended) | +2.4% |
| Raise Growth $497→$597 | $21,080 | +$2,800 (blended) | +13.3% |
| Raise both | $21,080 | +$3,300 | +15.6% |

**Raising Growth to $597 is the highest-leverage pricing move.** Even at 10% churn from price sensitivity, net MRR impact is strongly positive. Recommend timing with a major feature launch for cover.

---

## 8. 12-Month Cash Milestones

| Milestone | Conservative | Base | Aggressive |
|---|---|---|---|
| Month 3 MRR | $2,034 | $7,378 | $34,194 |
| Month 6 MRR | $3,920 | $12,648 | $57,546 |
| Month 9 MRR | $5,488 | $17,391 | $73,392 |
| Month 12 MRR | $7,056 | $21,080 | $85,068 |
| Month 12 ARR | $84,672 | $252,960 | $1,020,816 |

**Base scenario Month 12: $252k ARR. Aggressive: $1M ARR in year 1.**

The difference between base and aggressive is 10 more customers per month — roughly 2-3 LinkedIn posts per week + a cold outreach cadence.
