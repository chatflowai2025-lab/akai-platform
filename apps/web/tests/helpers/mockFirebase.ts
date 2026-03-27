import { Page } from '@playwright/test';

export async function mockFirebaseState(page: Page, firestoreData: Record<string, unknown>) {
  await page.addInitScript((data) => {
    (window as unknown as Record<string, unknown>).__MOCK_FIRESTORE__ = data;
    (window as unknown as Record<string, unknown>).__MOCK_USER__ = {
      uid: (data['uid'] as string) || 'test-uid-akai-qa',
      email: (data['email'] as string) || 'qa@getakai.ai',
      displayName: 'QA User',
    };
    (window as unknown as Record<string, unknown>).__MOCK_AUTH_STATE__ = 'authenticated';
  }, firestoreData);
}

export async function clearMockState(page: Page) {
  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>).__MOCK_FIRESTORE__;
    delete (window as unknown as Record<string, unknown>).__MOCK_USER__;
    delete (window as unknown as Record<string, unknown>).__MOCK_AUTH_STATE__;
  });
}
