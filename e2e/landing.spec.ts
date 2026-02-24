import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('shows heading and 3 studio cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'GSI AI Studio' })).toBeVisible();
    await expect(page.getByText('Story Studio')).toBeVisible();
    await expect(page.getByText('Music Lab')).toBeVisible();
    await expect(page.getByText('Quiz Maker')).toBeVisible();
  });

  test('studio cards link to correct URLs', async ({ page }) => {
    await page.goto('/');
    const storyLink = page.getByRole('link', { name: /Story Studio/ });
    await expect(storyLink).toHaveAttribute('href', '/create/story');

    const musicLink = page.getByRole('link', { name: /Music Lab/ });
    await expect(musicLink).toHaveAttribute('href', '/create/music');

    const quizLink = page.getByRole('link', { name: /Quiz Maker/ });
    await expect(quizLink).toHaveAttribute('href', '/create/quiz');
  });

  test('page has meta description content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Create with AI. Learn how it works.')).toBeVisible();
  });
});
