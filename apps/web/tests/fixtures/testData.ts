export const TEST_USER = {
  uid: 'test-uid-akai-qa',
  email: 'qa@getakai.ai',
};

export const STATES = {
  fullyConnected: {
    uid: TEST_USER.uid,
    email: TEST_USER.email,
    businessName: 'AKAI Test Co',
    gmail: { connected: true, email: 'qa@getakai.ai', scopes: 'gmail.readonly gmail.send' },
    googleCalendarConnected: true,
    googleRefreshToken: 'mock-refresh-token',
    onboarding: { businessName: 'AKAI Test Co', industry: 'trades', location: 'Sydney' },
    campaignConfig: { businessName: 'AKAI Test Co', industry: 'trades', location: 'Sydney' },
    voiceConfig: { configured: true, businessName: 'AKAI Test Co' },
    inboxConnection: { connected: false },
    plan: 'pro',
    notificationPrefs: { email: true, telegram: false },
  },
  freshUser: {
    uid: TEST_USER.uid,
    email: TEST_USER.email,
  },
  gmailOnly: {
    uid: TEST_USER.uid,
    email: TEST_USER.email,
    gmail: { connected: true, email: 'qa@getakai.ai' },
  },
  calendarOnly: {
    uid: TEST_USER.uid,
    email: TEST_USER.email,
    googleCalendarConnected: true,
    googleRefreshToken: 'mock-token',
  },
};

export const SAMPLE_LEADS = [
  { id: 'lead-1', name: 'James Smith', phone: '+61400000001', email: 'james@test.com', company: 'Smith Plumbing', status: 'new', source: 'homepage' },
  { id: 'lead-2', name: 'Sarah Jones', phone: '+61400000002', email: 'sarah@test.com', company: 'Jones Real Estate', status: 'called', source: 'web_audit' },
];

export const SAMPLE_ENQUIRY = {
  id: 'enq-1',
  from: 'prospect@test.com',
  subject: 'Enquiry about lead generation services',
  body: 'Hi, I am looking for help with lead gen for my plumbing business in Sydney.',
  receivedAt: new Date().toISOString(),
  status: 'proposal_draft',
  proposal: {
    body: 'Dear James,\n\nThank you for your enquiry...',
    generatedAt: new Date().toISOString(),
  },
};
