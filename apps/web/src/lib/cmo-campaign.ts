/**
 * CMO Daily "Did you know?" drip campaign
 * 14-message sequence covering all 9 AKAI modules.
 * Day 1 = index 0, Day 14 = index 13.
 *
 * Tone: sharp, confident, aspirational. AKAI brand voice.
 * These go to Trailblazers — the inner circle. Final, polished, no-approval-needed.
 */

export interface DripMessage {
  day: number;
  subject: string;
  body: string;
  module: string;
}

export const DRIP_MESSAGES: DripMessage[] = [
  {
    day: 1,
    module: 'Sales',
    subject: 'Did you know? Sophie called 47 leads last night.',
    body: `You're in the inner circle. So let's skip the pitch.

Did you know? You can give AKAI a list of 20 leads right now — and Sophie will call every single one tonight.

Not tomorrow. Not "within a few business days." Tonight.

She qualifies them, handles objections, and books the ones worth your time straight into your calendar.

You wake up to meetings. Not maybes.

→ Head to your Sales module. Upload a list, or ask AKAI to find one.

— AKAI`,
  },
  {
    day: 2,
    module: 'Social',
    subject: 'Did you know? A week of content. 60 seconds.',
    body: `Most businesses post inconsistently. Then wonder why nobody's paying attention.

Did you know? AKAI generates a full week of Instagram, LinkedIn, and Facebook content — captions, hashtags, posting times — in under 60 seconds.

You don't need a content team.
You don't need a content calendar.
You just need to show up and hit post.

→ Open your Social module. Pick a theme. Watch it write itself.

— AKAI`,
  },
  {
    day: 3,
    module: 'Email Guard',
    subject: 'Did you know? AKAI already read your inbox this morning.',
    body: `While you were sleeping, someone sent an enquiry to your business.

Did you know? AKAI reads every inbound email, classifies it, and drafts a professional reply — before you've had your first coffee.

You set the rules once: draft only, auto-send, or hold until business hours.
AKAI handles the rest. Every time. No exceptions.

The average business takes 47 hours to reply to a lead.
AKAI replies in minutes.

→ Connect your inbox in Email Guard. Takes 90 seconds.

— AKAI`,
  },
  {
    day: 4,
    module: 'Web',
    subject: 'Did you know? Your website might be losing you money right now.',
    body: `No audit. No idea. No leads.

Did you know? AKAI audits your website in seconds — speed, SEO, mobile, conversion — and gives you a ranked list of exactly what to fix.

Not vague suggestions. Specific issues. Priority order.

Most sites we audit are leaving 30-40% of their traffic on the table. Slow load times, missing meta tags, broken mobile layouts.

All fixable. Most in minutes.

→ Drop your URL into the Web module. Free. Instant.

— AKAI`,
  },
  {
    day: 5,
    module: 'Ads',
    subject: 'Did you know? Full Google Ads campaign. 30 seconds.',
    body: `Agencies charge $2,000 to build what AKAI builds in 30 seconds.

Did you know? AKAI generates a complete Google Ads campaign — 3 ad groups, 5 headlines each, 2 descriptions, 8 keywords — from your business name and goal.

You set the budget. AI writes the copy. You review, launch, and move on.

No copywriter. No account manager. No invoices.

→ Build your first campaign in the Ads module.

— AKAI`,
  },
  {
    day: 6,
    module: 'Voice',
    subject: 'Did you know? Sophie never gets tired. Never takes a day off.',
    body: `Your best sales rep has a bad week. Sophie doesn't.

Did you know? You can configure Sophie's voice, opening script, call hours, and fallback behaviour in the Voice module — and she runs exactly that way. Every call. Every day.

No sick days. No "I'll follow up tomorrow." No lost leads.

Set her once. Let her work.

→ Open the Voice module. Configure Sophie your way.

— AKAI`,
  },
  {
    day: 7,
    module: 'Recruit',
    subject: 'Did you know? AKAI screens CVs so you never waste an interview again.',
    body: `The average job post gets 250 applications. You should talk to maybe 5.

Did you know? AKAI reads every application, scores each candidate 0-100% against your requirements, and tells you exactly who to interview — and who to pass on.

80%+ gets fast-tracked.
60-79% gets flagged for your review.
Below 60% gets a professional rejection. Automatically.

You only talk to the ones worth your time.

→ Post a job or source candidates in the Recruit module.

— AKAI`,
  },
  {
    day: 8,
    module: 'Proposals',
    subject: 'Did you know? A boardroom-quality proposal in under 10 seconds.',
    body: `Most proposals take hours to write and lose half the deals they're sent to.

Did you know? AKAI writes a full sales proposal in under 10 seconds — executive summary, tailored solution, investment table, ROI projection — personalised to the specific prospect.

Pick who you're pitching. Choose the modules to include. Set the tone. Done.

Export to email, PDF, or clipboard and send it before the competition even starts typing.

→ Generate your first proposal in the Proposals module.

— AKAI`,
  },
  {
    day: 9,
    module: 'Calendar',
    subject: 'Did you know? Sophie books the meeting before the lead hangs up.',
    body: `The best time to book a meeting is when someone is already saying yes.

Did you know? When Sophie qualifies a lead, she checks your calendar and books the follow-up in real time — no scheduling links, no "I'll have my team reach out."

Connect Google Calendar or Outlook and every qualified lead lands in your diary automatically.

→ Connect your calendar. Let Sophie fill it.

— AKAI`,
  },
  {
    day: 10,
    module: 'Ads',
    subject: 'Did you know? Meta Ads built in the same 30 seconds as Google.',
    body: `You shouldn't have to choose between Google and Facebook. Run both.

Did you know? AKAI builds Meta Ads campaigns — Facebook and Instagram — in the same flow as Google Ads.

3 ad sets. Tailored copy. CTAs matched to your goal. Character-limit compliant. Ready to paste into Meta Ads Manager and go live.

One session. Both platforms. No agency.

→ Add a Meta campaign in your Ads module.

— AKAI`,
  },
  {
    day: 11,
    module: 'Sales',
    subject: 'Did you know? Sophie starts calling within the hour of upload.',
    body: `Speed is the only edge that matters in outbound sales.

Did you know? You can upload a CSV of leads — name, phone, company, that's it — and Sophie starts calling within the hour.

No setup calls. No onboarding sessions. No waiting.

She handles the dial, the intro, the qualification, and the booking. You get notified when someone's worth your time.

→ Upload your list in the Sales module. She'll take it from there.

— AKAI`,
  },
  {
    day: 12,
    module: 'Email Guard',
    subject: 'Did you know? AKAI sends proposals at 2am and nobody blinks.',
    body: `Your best competitors are already responding to leads at midnight.

Did you know? You can set AKAI to automatically send a proposal the moment an enquiry hits your inbox — 2am Sunday included.

Or hold until 9am if you want it to look human. Either way, AKAI wrote it, formatted it, and queued it. You did nothing.

Most businesses take 47 hours to reply. AKAI takes minutes.
That's not a small advantage. That's a different game entirely.

→ Set your reply rules in Email Guard.

— AKAI`,
  },
  {
    day: 13,
    module: 'Social',
    subject: 'Did you know? Instagram and LinkedIn want different things from you.',
    body: `Posting the same content everywhere is why most business social accounts go nowhere.

Did you know? AKAI adapts your content for each platform automatically — punchy and visual for Instagram, authoritative and insight-led for LinkedIn, conversational for Facebook.

Same brief. Three different pieces. All done in one session.

One month of content. One afternoon. Never staring at a blank screen again.

→ Try the Social module. Describe your business once. Let AKAI do the rest.

— AKAI`,
  },
  {
    day: 14,
    module: 'Web',
    subject: 'Did you know? AKAI rewrites your website copy too.',
    body: `An audit tells you what's wrong. AKAI fixes it.

Did you know? AKAI doesn't just score your website — it rewrites the copy. Homepage, about page, service descriptions, CTAs, meta tags. All of it.

Give it your URL and a goal. It comes back with copy that converts.

No brief documents. No agency back-and-forth. No three rounds of revisions.

You've been in the inner circle for two weeks now.
If there's one thing to do today — it's this: open your dashboard and run the platform.

You built the right tool. Now let it work.

→ Your dashboard is waiting: getakai.ai/dashboard

— AKAI`,
  },
];

/**
 * Returns the drip message for a given day since signup.
 * Days beyond 14 cycle back through the sequence.
 * Day 0 or negative returns message 1.
 */
export function getDripMessage(daysSinceSignup: number): DripMessage {
  const index = Math.max(0, (daysSinceSignup - 1) % DRIP_MESSAGES.length);
  // DRIP_MESSAGES always has 14 entries; index is always in range.
  return DRIP_MESSAGES[index] as DripMessage;
}
