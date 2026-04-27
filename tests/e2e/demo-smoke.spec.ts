import { expect, test } from '@playwright/test';

test('demo supports input, country selector, and aligned dropdown', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const primaryInput = page.locator('input[type="tel"]').first();

  await primaryInput.fill('');
  await primaryInput.pressSequentially('420601123456');

  await expect(primaryInput).toHaveValue('+420 601 123 456');
  await expect(page.getByText('Country name').first().locator('..').getByText('Czechia')).toBeVisible();

  const selectorSection = page.getByLabel('Country selector example');
  const selectorInput = selectorSection.locator('input[type="tel"]');

  await selectorSection.locator('.phone-mask-input__country-selector-button').click();

  const wrapperBox = await selectorSection.locator('.phone-mask-input').boundingBox();
  const menuBox = await selectorSection.locator('.phone-mask-input__country-selector-menu').boundingBox();

  expect(Math.abs((menuBox?.x ?? 0) - (wrapperBox?.x ?? 0))).toBeLessThanOrEqual(1);

  await selectorSection.locator('.phone-mask-input__country-selector-search').fill('Kazakhstan');
  await selectorSection.locator('.phone-mask-input__country-selector-search').press('Enter');

  await expect(selectorInput).toHaveValue('+7 ___ ___ __ __');
  await expect(selectorSection.getByText('Kazakhstan')).toBeVisible();
});

test('problematic Czech number can be deleted without phantom digits', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const problematicSection = page.getByLabel('Problematic masks');
  const input = problematicSection.locator('input[type="tel"]');

  await input.fill('');
  await input.pressSequentially('420601123456');
  await expect(input).toHaveValue('+420 601 123 456');

  for (let index = 0; index < 7; index += 1) {
    await input.press('Backspace');
  }

  await expect(input).toHaveValue('+420 60_ ___ ___');
  await expect(problematicSection.locator('dd').filter({ hasText: '+42060' })).toBeVisible();
});
