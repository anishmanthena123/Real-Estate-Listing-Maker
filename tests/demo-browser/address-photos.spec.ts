import { expect, test } from '@playwright/test';
import sharp from 'sharp';
test('address entry and local pictures remain isolated, grounded and resettable', async ({
  page,
}) => {
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiCalls.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page
    .getByLabel('Property address', { exact: true })
    .fill('900 Test Avenue, Example City');
  await page.getByRole('button', { name: 'Start with this address' }).click();
  await expect(page.locator('.property-title h3')).toHaveText(
    '900 Test Avenue, Example City',
  );
  await expect(page.locator('.facts-bar')).toContainText('Not supplied');
  await expect(page.locator('.photo-placeholder')).toHaveCount(0);
  await page
    .getByRole('button', { name: '3 Create draft', exact: true })
    .click();
  await page.getByRole('button', { name: 'Generate sample draft' }).click();
  await expect(page.getByLabel('Your marketing draft')).toHaveValue(
    'Located at 900 Test Avenue, Example City.',
  );
  await page
    .getByRole('button', { name: '2 Photos & features', exact: true })
    .click();
  const bytes = await sharp({
    create: { width: 20, height: 12, channels: 3, background: '#bcd8b0' },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel('Import property pictures', { exact: false })
    .setInputFiles([
      { name: 'kitchen.png', mimeType: 'image/png', buffer: bytes },
      { name: 'patio.png', mimeType: 'image/png', buffer: bytes },
    ]);
  await expect(page.locator('.imported-gallery article')).toHaveCount(2);
  await expect(
    page.getByRole('img', { name: 'Imported picture: kitchen.png' }),
  ).toBeVisible();
  await expect(page.locator('.feature-row')).toHaveCount(0);
  await page
    .getByLabel('Add a visible feature to review')
    .selectOption('kitchen island');
  await page.getByRole('button', { name: 'Add pending feature' }).click();
  const feature = page
    .locator('.feature-row')
    .filter({ hasText: 'kitchen island' });
  await expect(feature.locator('.badge')).toHaveText('PENDING');
  await page
    .getByRole('button', { name: '3 Create draft', exact: true })
    .click();
  await page.getByRole('button', { name: 'Generate sample draft' }).click();
  await expect(page.getByLabel('Your marketing draft')).not.toHaveValue(
    /kitchen island/,
  );
  await page
    .getByRole('button', { name: '2 Photos & features', exact: true })
    .click();
  await feature.getByRole('button', { name: 'Verify', exact: false }).click();
  await page
    .getByRole('button', { name: '3 Create draft', exact: true })
    .click();
  await page.getByRole('button', { name: 'Generate sample draft' }).click();
  await expect(page.getByLabel('Your marketing draft')).toHaveValue(
    /Features kitchen island/,
  );
  await page.locator('.property-browser summary').click();
  await page.getByRole('button', { name: /The Willow House/ }).click();
  await expect(page.locator('.imported-gallery article')).toHaveCount(0);
  await page
    .getByRole('button', { name: /900 Test Avenue, Example City/ })
    .click();
  await expect(page.locator('.imported-gallery article')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Remove kitchen.png', exact: true })
    .click();
  await expect(page.locator('.imported-gallery article')).toHaveCount(1);
  await expect(feature.locator('.badge')).toHaveText('PENDING');
  await expect(
    page.locator('.claim.flagged').filter({ hasText: 'kitchen island' }),
  ).toHaveCount(1);
  await page
    .getByLabel('Import property pictures', { exact: false })
    .setInputFiles({
      name: 'bad.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
  await expect(page.getByRole('alert')).toContainText('JPEG');
  await expect(page.locator('.imported-gallery article')).toHaveCount(1);
  await page
    .getByLabel('Import property pictures', { exact: false })
    .setInputFiles({
      name: 'big.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
    });
  await expect(page.getByRole('alert')).toContainText('8 MB');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(
    page.getByLabel('Property address', { exact: true }),
  ).toHaveValue('');
  await expect(page.locator('.imported-gallery article')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});
