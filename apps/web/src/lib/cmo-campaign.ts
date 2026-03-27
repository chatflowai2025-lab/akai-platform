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
    module: 'Email Guard',
    subject: 'Did you know? You can email me directly — and I\'ll take action for you.',
    body: `You're in the inner circle. So here's something most people don't know:

You can email me directly — and I act on it.

Connect your inbox and AKAI reads every email that comes in. Every enquiry. Every lead. Every vendor. I draft the replies, flag the hot ones, and take action — before you've looked at your phone.

Not a filter. Not a sorter. An AI that actually does the work.

The average business takes 47 hours to reply to a lead.
AKAI replies in minutes. Every time.

→ Connect your inbox now: getakai.ai/email-guard

— AKAI`,
  },
  {
    day: 2,
    module: 'AK Chat',
    subject: 'Did you know? Your AI business partner is live right now.',
    body: `You have an AI business partner. Not a chatbot — a partner.

Open AK Chat and ask it anything about your business. Strategy. Copy. A client situation. What to post today. How to price a project. It knows your business and it gives you real answers.

Right now. No waiting. No ticket. No agency retainer.

Most of our Trailblazers open it first thing every morning and last thing every night.

→ Talk to your AI business partner: getakai.ai/dashboard

— AKAI`,
  },
  {
    day: 3,
    module: 'Web',
    subject: 'Did you know? Your website has a score — and you can see it in 60 seconds.',
    body: `Right now, your website is either winning you business or losing it. You probably don't know which.

AKAI audits your site in 60 seconds — speed, SEO, mobile, conversion gaps — and gives you a ranked list of exactly what to fix.

Not vague suggestions. Real issues. Priority order. Fix the top three and you'll see the difference.

Most sites we audit are leaving 30-40% of their traffic on the table.

→ Get your website scored right now: getakai.ai/web

— AKAI`,
  },
  {
    day: 4,
    module: 'Proposals',
    subject: 'Did you know? A client proposal in 30 seconds. Live right now.',
    body: `You have a prospect. You need a proposal. Most people spend 2 hours writing one.

AKAI writes it in 30 seconds.

Executive summary. Tailored solution. Investment table. ROI projection. All personalised to the specific client. All ready to send.

Export to PDF or copy straight into an email. Done before the competition even opens a blank doc.

→ Generate a proposal right now: getakai.ai/proposals

— AKAI`,
  },
  {
    day: 5,
    module: 'Social',
    subject: 'Did you know? A week of Instagram posts. Right now. In under 60 seconds.',
    body: `You don't have time to think about Instagram every day. You don't have to.

AKAI writes a full week of social content — captions, hashtags, posting times — in under 60 seconds. Instagram, LinkedIn, Facebook. All adapted for each platform.

Describe your business once. Hit generate. Schedule or post.

That's it. You're done for the week.

→ Write your week of content right now: getakai.ai/social

— AKAI`,
  },
  {
    day: 6,
    module: 'Ads',
    subject: 'Did you know? Your next Google ad campaign. Written in 60 seconds.',
    body: `Agencies charge $2,000+ to build what AKAI builds in 60 seconds.

Tell AKAI your business and your goal. It writes a complete Google Ads campaign — headlines, descriptions, keywords, ad groups — ready to launch.

You set the budget. AKAI writes the copy. You review and go live.

No copywriter. No account manager. No waiting.

→ Build your campaign right now: getakai.ai/ads

— AKAI`,
  },
  {
    day: 7,
    module: 'Recruit',
    subject: 'Did you know? You can screen 10 CVs before lunch.',
    body: `The average job post gets 250 applications. You should interview maybe 5.

AKAI reads every CV, scores each candidate 0-100% against your requirements, and tells you exactly who to call — and who to pass on.

Fast-track the top scores. Auto-reject the rest with a professional email. You only see the ones worth your time.

Upload a stack before 11am. By lunch, you have a shortlist.

→ Start screening right now: getakai.ai/recruit

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
