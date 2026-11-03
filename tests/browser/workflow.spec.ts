import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import sharp from 'sharp';
test('agent verifies evidence, reviews claims, saves ready content and revisits history', async ({
  page,
}, testInfo) => {
  const email = `${randomUUID()}@browser.test`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'New to Listly? Create an account' })
      .click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page
      .getByLabel('Password', { exact: true })
      .fill('a-real-browser-test-password');
    await page
      .getByRole('button', { name: 'Create account', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your workspace, at a glance.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add your first property' }).click();
    for (const [label, value] of [
      ['Street address', '123 Oak Street'],
      ['City', 'Austin'],
      ['State / region', 'TX'],
      ['ZIP / postal code', '78701'],
      ['Price (USD)', '450000'],
      ['Bedrooms', '3'],
      ['Bathrooms', '2'],
      ['Interior square feet', '1800'],
      ['Year built', '2005'],
      ['Lot size (sq ft, optional)', '5000'],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByRole('button', { name: 'Save property', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: '123 Oak Street', exact: true }),
    ).toBeVisible();
    const image = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#ceddd3' },
    })
      .png()
      .toBuffer();
    await page.locator('input[type=file]').setInputFiles({
      name: 'upload-test.png',
      mimeType: 'image/png',
      buffer: image,
    });
    await page
      .getByRole('button', { name: 'Analyze photo', exact: true })
      .click();
    const island = page
      .locator('.feature-row')
      .filter({ hasText: 'kitchen island' });
    const windows = page
      .locator('.feature-row')
      .filter({ hasText: 'large windows' });
    await expect(island.locator('.badge')).toHaveText('PENDING');
    await island.getByRole('button', { name: 'Verify', exact: true }).click();
    await windows.getByRole('button', { name: 'Reject', exact: true }).click();
    await page
      .getByRole('button', { name: 'Generate draft', exact: true })
      .click();
    const editor = page.getByLabel('Marketing content', { exact: true });
    await expect(editor).toHaveValue(/Located at/);
    await expect(editor).toHaveValue(/kitchen island/);
    await expect(editor).not.toHaveValue(/large windows/);
    await editor.fill('3 bedrooms. Features pool. Safe neighborhood.');
    await page
      .getByRole('button', { name: 'Save & validate', exact: true })
      .click();
    await expect(page.locator('.claim.flagged')).toHaveCount(2);
    await page
      .locator('.claim.flagged')
      .filter({ hasText: 'Features pool' })
      .getByRole('button', { name: 'Remove containing sentence' })
      .click();
    await page
      .locator('.claim.flagged')
      .filter({ hasText: 'Safe neighborhood' })
      .getByRole('button', { name: 'Remove containing sentence' })
      .click();
    await page
      .getByRole('button', { name: 'Save & validate', exact: true })
      .click();
    await expect(page.locator('.claim.flagged')).toHaveCount(0);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Mark ready', exact: true }).click();
    await expect(page.locator('.editor .section-heading .badge')).toHaveText(
      'READY',
    );
    await page
      .getByRole('button', { name: 'Needs work', exact: false })
      .click();
    await page
      .getByLabel('Optional feedback', { exact: true })
      .fill('Testing claim review and evidence controls.');
    await page
      .getByRole('button', { name: 'Send feedback', exact: true })
      .click();
    await expect(
      page.getByText('1 feedback submission(s) saved for this generation.'),
    ).toBeVisible();
    if (testInfo.project.name === 'desktop')
      await page.screenshot({
        path: 'docs/screenshots/review.png',
        fullPage: true,
      });
    await page.getByRole('button', { name: 'Overview', exact: false }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page
        .locator('.metric')
        .filter({ hasText: 'Ready content' })
        .locator('strong'),
    ).toHaveText('1');
    if (testInfo.project.name === 'desktop')
      await page.screenshot({
        path: 'docs/screenshots/dashboard.png',
        fullPage: true,
      });
    else
      await page.screenshot({
        path: 'docs/screenshots/mobile.png',
        fullPage: true,
      });
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.viewport);
    await page
      .getByRole('button', { name: 'MLS description', exact: false })
      .click();
    await expect(editor).toHaveValue('3 bedrooms.');
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', { name: 'Delete property', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your workspace, at a glance.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    const client = new Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await client.connect();
    const users = await client.query<{ id: string }>(
      'SELECT id FROM "User" WHERE email=$1',
      [email],
    );
    for (const user of users.rows) {
      await client.query(
        'DELETE FROM "RateLimit" WHERE key = ANY($1::text[])',
        [[`generate:${user.id}`, `analyze:${user.id}`, `upload:${user.id}`]],
      );
    }
    await client.query('DELETE FROM "User" WHERE email=$1', [email]);
    await client.end();
  }
});
