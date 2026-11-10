import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
async function register(page: Page, email: string) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'New to Listly? Create an account' })
    .click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('a-browser-address-test-password');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add your first property' }).click();
}
async function cleanup(email: string) {
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query('DELETE FROM "User" WHERE email=$1', [email]);
  } finally {
    await client.end();
  }
}
test('agent can save one address and generate without invented numeric facts', async ({
  page,
}) => {
  const email = `${randomUUID()}@address-browser.test`;
  try {
    await register(page, email);
    await page
      .getByLabel('Full US property address')
      .fill('900 Test Avenue, Austin, TX 78701');
    await page
      .getByRole('button', { name: 'Use address only', exact: false })
      .click();
    await page
      .getByRole('button', { name: 'Save property', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: '900 Test Avenue', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Price not supplied', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Continue to content', exact: false })
      .click();
    await page
      .getByRole('button', { name: 'Generate draft', exact: true })
      .click();
    await expect(
      page.getByLabel('Marketing content', { exact: true }),
    ).toHaveValue('Located at 900 Test Avenue, Austin, TX 78701.');
    const editor = page.getByLabel('Marketing content', { exact: true });
    await editor.fill(
      'Located at 900 Test Avenue, Austin, TX 78701. Features pool.',
    );
    await page
      .getByRole('button', { name: 'Back to photos', exact: false })
      .click();
    await page
      .getByRole('button', { name: 'Continue to content', exact: false })
      .click();
    await expect(editor).toHaveValue(/Features pool/);
  } finally {
    await cleanup(email);
  }
});
test('provider suggestions require review and cannot invent a listing price', async ({
  page,
}) => {
  const email = `${randomUUID()}@lookup-browser.test`;
  try {
    await register(page, email);
    // Tests the UI review boundary; provider request/response handling is separately unit-tested.
    await page.route('**/api/property-lookup', (route) =>
      route.fulfill({
        json: {
          source: 'ATTOM',
          retrievedAt: '2026-11-01T12:00:00Z',
          requestedAddress: '123 Oak Street, Austin, TX 78701',
          matchedAddress: '123 OAK ST, Austin, TX 78701',
          requiresReview: true,
          notice: 'Confirm the address and provided facts. Price is unknown.',
          suggestedFacts: {
            address: '123 OAK ST',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            price: null,
            bedrooms: 3,
            bathrooms: 2,
            squareFeet: 1800,
            yearBuilt: 2005,
            propertyType: 'House',
            lotSize: null,
          },
        },
      }),
    );
    await page
      .getByLabel('Full US property address')
      .fill('123 Oak Street, Austin, TX 78701');
    await page
      .getByRole('button', { name: 'Look up property', exact: true })
      .click();
    await expect(page.getByLabel('Bedrooms', { exact: true })).toHaveValue('3');
    await expect(page.getByLabel('Price (USD)', { exact: true })).toHaveValue(
      '',
    );
    await expect(
      page.getByRole('button', { name: 'Save property', exact: true }),
    ).toBeDisabled();
    await page.getByRole('checkbox').check();
    await page
      .getByRole('button', { name: 'Save property', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: '123 OAK ST', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Price not supplied', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Continue to content', exact: false })
      .click();
    await page
      .getByRole('button', { name: 'Generate draft', exact: true })
      .click();
    await expect(
      page.getByLabel('Marketing content', { exact: true }),
    ).toHaveValue(/3 bedrooms/);
    await expect(
      page.getByLabel('Marketing content', { exact: true }),
    ).not.toHaveValue(/Listed at/);
  } finally {
    await cleanup(email);
  }
});
