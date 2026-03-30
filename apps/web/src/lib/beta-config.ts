// AKAI Beta Access Control
// safeMode = full platform experience, no live calls or external emails sent

export const BETA_MODE = false;
export const BETA_CONTACT_EMAIL = process.env.NEXT_PUBLIC_BETA_CONTACT_EMAIL ?? 'hello@getakai.ai';

export const BETA_WHITELIST: Record<string, { name: string; safeMode: boolean }> = {
  'mrakersten@gmail.com': { name: 'Aaron', safeMode: true },
  'pagliariccimarco@gmail.com': { name: 'Marco', safeMode: false },
  'info@apheritageinterior.com.au': { name: 'AP Heritage', safeMode: false },
  'danielle.avissar@gmail.com': { name: 'Danielle', safeMode: false },
  'henrik.mortensen@live.com.au': { name: 'Henrik', safeMode: true },
  'kemalarafeh@gmail.com': { name: 'Kemal', safeMode: true },
  'jilljjqb@gmail.com': { name: 'Jill', safeMode: true },
  'chatflowai2025@gmail.com': { name: 'Aaron', safeMode: false },
  'getakainow@outlook.com': { name: 'Aaron', safeMode: false },
  'getakaiai@outlook.com': { name: 'Aaron', safeMode: false },
};

export function isWhitelisted(email: string): boolean {
  return email.toLowerCase() in BETA_WHITELIST;
}

export function isSafeMode(email: string): boolean {
  const entry = BETA_WHITELIST[email.toLowerCase() as keyof typeof BETA_WHITELIST];
  return entry?.safeMode ?? false;
}
