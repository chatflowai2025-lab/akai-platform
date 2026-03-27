/**
 * CMO Daily "Did you know?" drip campaign
 * 14-message sequence covering all 9 AKAI modules.
 * Day 1 = index 0, Day 14 = index 13.
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
    subject: 'Did you know? Sophie is ready to call your leads tonight.',
    body: `Did you know? You can ask AKAI to find 20 leads in your industry and have Sophie call them tonight.

Sophie is your AI sales rep — she calls, qualifies, and books meetings while you sleep. No scripts to write, no numbers to dial yourself.

👉 Head to your Sales module and upload a lead list (or let AKAI find one for you).

— The AKAI Team`,
  },
  {
    day: 2,
    module: 'Social',
    subject: 'Did you know? A week of Instagram content in 60 seconds.',
    body: `Did you know? AKAI can write a week of Instagram content for your business in under 60 seconds.

Just describe your business and pick a theme — AKAI writes captions, hashtags, and posting times optimised for reach.

👉 Try the Social module today.

— The AKAI Team`,
  },
  {
    day: 3,
    module: 'Email Guard',
    subject: 'Did you know? AKAI replies to enquiries before your coffee is ready.',
    body: `Did you know? AKAI reads every inbound email and drafts a reply before you've had your morning coffee.

Connect your Gmail or Outlook and AKAI will read enquiries, generate professional proposals, and either send them automatically or hold for your approval.

👉 Connect your inbox in the Email Guard module.

— The AKAI Team`,
  },
  {
    day: 4,
    module: 'Web',
    subject: 'Did you know? Your website might be losing you leads right now.',
    body: `Did you know? AKAI can audit your website in seconds and show you exactly why visitors aren't converting.

Speed, SEO, mobile experience — we score them all and give you a prioritised fix list. No agency required.

👉 Drop your URL into the Web module for a free audit.

— The AKAI Team`,
  },
  {
    day: 5,
    module: 'Ads',
    subject: 'Did you know? A full Google Ads campaign built in 30 seconds.',
    body: `Did you know? AKAI builds a complete Google Ads campaign — headlines, descriptions, keywords, 3 ad groups — in about 30 seconds.

Set your daily budget, describe your business, and hit Build. AI does the copywriting.

👉 Launch your first campaign in the Ads module.

— The AKAI Team`,
  },
  {
    day: 6,
    module: 'Voice',
    subject: 'Did you know? Sophie can call 100 leads before lunch.',
    body: `Did you know? Sophie AI can make 100 outbound calls before lunch — and you'll only hear from the ones who said yes.

Configure her voice, script, and call hours in the Voice module. Set it once, let it run.

👉 Set up Sophie in the Voice module.

— The AKAI Team`,
  },
  {
    day: 7,
    module: 'Recruit',
    subject: 'Did you know? AKAI screens CVs so you only see the best candidates.',
    body: `Did you know? AKAI reads every job application and scores candidates 0–100% against your requirements.

Only talk to people who genuinely fit the role. AI handles the screening; you make the hire.

👉 Post a job or source candidates in the Recruit module.

— The AKAI Team`,
  },
  {
    day: 8,
    module: 'Proposals',
    subject: 'Did you know? A professional sales proposal in under 10 seconds.',
    body: `Did you know? AKAI writes a full, personalised sales proposal — executive summary, solution, investment table, ROI projection — in under 10 seconds.

Pick a prospect, choose the modules you want to pitch, and AKAI does the rest.

👉 Generate your first proposal in the Proposals module.

— The AKAI Team`,
  },
  {
    day: 9,
    module: 'Calendar',
    subject: 'Did you know? Sophie books meetings directly into your calendar.',
    body: `Did you know? When Sophie qualifies a lead, she books the follow-up meeting straight into your calendar — no back-and-forth, no scheduling links to send.

Connect Google Calendar or Outlook and let AKAI manage your schedule.

👉 Connect your calendar in the Calendar module.

— The AKAI Team`,
  },
  {
    day: 10,
    module: 'Ads',
    subject: 'Did you know? AKAI builds Meta Ads too — Facebook + Instagram in one hit.',
    body: `Did you know? AKAI builds Meta Ads campaigns for Facebook and Instagram in the same flow as Google Ads.

Three ad sets, tailored copy, CTAs matched to your goal. Paste into Meta Ads Manager and go.

👉 Try Meta Ads in the Ads module.

— The AKAI Team`,
  },
  {
    day: 11,
    module: 'Sales',
    subject: 'Did you know? You can upload a lead list in any format and Sophie handles the rest.',
    body: `Did you know? You can upload a CSV of leads — just first name, last name, phone, company — and Sophie starts calling within the hour.

No formatting rules, no manual prep. AKAI cleans and dials.

👉 Upload your lead list in the Sales module.

— The AKAI Team`,
  },
  {
    day: 12,
    module: 'Email Guard',
    subject: "Did you know? AKAI can auto-send proposals while you're asleep.",
    body: `Did you know? You can set AKAI to automatically send a proposal the moment an enquiry arrives -- even at 2am on a Sunday.

The average business takes 47 hours to reply to a lead. AKAI replies in minutes.

👉 Set your reply rules in the Email Guard module.

— The AKAI Team`,
  },
  {
    day: 13,
    module: 'Social',
    subject: 'Did you know? AKAI writes different content for every platform — automatically.',
    body: `Did you know? AKAI adapts your content for Instagram, LinkedIn, and Facebook — different tone, format, and length for each platform, from a single brief.

One session. A month of content. Zero writer's block.

👉 Generate your content in the Social module.

— The AKAI Team`,
  },
  {
    day: 14,
    module: 'Web',
    subject: 'Did you know? AKAI can rewrite your website copy in minutes.',
    body: `Did you know? AKAI doesn't just audit your website — it rewrites the copy to convert better.

Give it your URL and a goal, and it returns homepage copy, meta descriptions, and CTAs ready to paste in.

👉 Try AI content generation in the Web module.

Ready to get the most out of AKAI? Reply to this email or head to your dashboard — we're here to help you get results fast.

— The AKAI Team`,
  },
];

/**
 * Returns the drip message for a given day since signup.
 * Days beyond 14 cycle back through the sequence.
 * Day 0 or negative returns message 1.
 */
export function getDripMessage(daysSinceSignup: number): DripMessage {
  const index = Math.max(0, (daysSinceSignup - 1) % DRIP_MESSAGES.length);
  return DRIP_MESSAGES[index];
}
