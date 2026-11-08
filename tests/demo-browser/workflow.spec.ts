import { expect, test } from '@playwright/test';
test('visitor explores the static demo, verifies evidence and reviews unsupported claims', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const apiCalls: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiCalls.push(request.url());
  });
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: /Beautiful property stories/ }),
  ).toBeVisible();
  await expect(
    page.getByText('Fictional properties, preloaded feature suggestions', {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Explore the workspace' }).click();
  const island = page
    .locator('.feature-row')
    .filter({ hasText: 'kitchen island' });
  await expect(island.locator('.badge')).toHaveText('PENDING');
  const pool = page.locator('.feature-row').filter({ hasText: 'pool' });
  await island.getByRole('button', { name: 'Verify', exact: false }).click();
  await pool.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.locator('summary').click();
  const json = await page.getByTestId('generation-context').textContent();
  expect(JSON.parse(json!).verifiedFeatures).toEqual(['kitchen island']);
  await page.getByRole('button', { name: 'Generate sample draft' }).click();
  const editor = page.getByLabel('Your marketing draft');
  await expect(editor).toHaveValue(/kitchen island/);
  await expect(editor).not.toHaveValue(/pool|large windows/);
  await page.getByRole('button', { name: 'Try an unsupported claim' }).click();
  await expect(page.locator('.claim.flagged')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Mark ready' })).toBeDisabled();
  await page
    .locator('.claim.flagged')
    .filter({ hasText: 'Renovated in 2025' })
    .getByRole('button', { name: 'Remove sentence' })
    .click();
  await page
    .locator('.claim.flagged')
    .filter({ hasText: 'Safe neighborhood' })
    .getByRole('button', { name: 'Remove sentence' })
    .click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Mark ready' }).click();
  await expect(
    page.locator('.review-panel .panel-heading > .badge'),
  ).toHaveText('READY');
  await island.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(
    page.locator('.review-panel .panel-heading > .badge'),
  ).toHaveText('NEEDS REVIEW');
  await expect(
    page.locator('.claim.flagged').filter({ hasText: 'kitchen island' }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Generate sample draft' }).click();
  await expect(editor).not.toHaveValue(/kitchen island|pool/);
  await expect(page.locator('.history-panel > button')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Helpful draft', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Helpful draft', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Maple Row Townhome/ }).click();
  await expect(page.locator('.property-title h3')).toHaveText(
    'Maple Row Townhome',
  );
  await expect(
    page.getByText('A thoughtful draft is one click away.'),
  ).toBeVisible();
  await page.getByRole('button', { name: /The Willow House/ }).click();
  await expect(page.locator('.history-panel > button')).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/demo-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator('.history-panel')).toHaveCount(0);
  await expect(
    page
      .locator('.feature-row')
      .filter({ hasText: 'kitchen island' })
      .locator('.badge'),
  ).toHaveText('PENDING');
  expect(errors).toEqual([]);
  expect(apiCalls).toEqual([]);
});
