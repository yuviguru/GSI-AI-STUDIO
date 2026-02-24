import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test('generates session ID on first visit', async ({ page }) => {
    await page.goto('/');

    // Wait for session hook to initialize
    const sessionId = await page.evaluate(() => localStorage.getItem('gsi-session-id'));
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  test('session persists across navigation', async ({ page }) => {
    await page.goto('/');

    const firstSessionId = await page.evaluate(() => localStorage.getItem('gsi-session-id'));

    // Navigate away and back
    await page.goto('/create/story');
    await page.goto('/');

    const secondSessionId = await page.evaluate(() => localStorage.getItem('gsi-session-id'));
    expect(secondSessionId).toBe(firstSessionId);
  });
});
