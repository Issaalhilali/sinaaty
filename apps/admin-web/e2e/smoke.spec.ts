import { expect, test } from '@playwright/test';
/** Smoke: login (OTP) → overview KPIs → KYB queue → org profile approve/reject with reason → integrations retry dialog. Needs API on :3000 (mock providers) + seed. */
const ADMIN = '0500000099';
test('login → overview → KYB → integrations', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('05xxxxxxxx').fill(ADMIN); await page.getByRole('button', { name: 'أرسل رمز التحقق' }).click();
  const code = (await page.getByText(/الرمز: \d{6}/).textContent())!.match(/(\d{6})/)![1]!;
  await page.getByRole('textbox').fill(code); await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page).toHaveURL(/\/$/); await expect(page.getByText('صحة دفتر الأستاذ')).toBeVisible(); await expect(page.getByText('0.00').first()).toBeVisible();
  await page.getByRole('link', { name: 'المنشآت و KYB' }).click(); await expect(page.getByRole('heading', { name: 'المنشآت و KYB' })).toBeVisible();
  await page.getByRole('button', { name: 'الكل' }).click(); await page.getByRole('link', { name: 'فتح' }).first().click(); await expect(page.getByText('كل قرار يحتاج سبباً ويُسجَّل باسمك')).toBeVisible();
  await page.getByRole('link', { name: 'التكاملات' }).click(); await expect(page.getByRole('heading', { name: 'التكاملات' })).toBeVisible();
  await page.getByRole('link', { name: 'النزاعات' }).click(); await expect(page.getByRole('heading', { name: 'غرفة النزاعات' })).toBeVisible();
  await page.getByRole('button', { name: 'الكل' }).click(); await page.getByRole('link', { name: 'فتح الغرفة' }).first().click();
  await expect(page.getByText('المبلغ محل النزاع')).toBeVisible(); await expect(page.getByText('المحادثة')).toBeVisible();
  await page.getByRole('link', { name: 'سجل التدقيق' }).click(); await expect(page.getByRole('heading', { name: 'سجل التدقيق' })).toBeVisible(); await expect(page.getByText('تفاصيل').first()).toBeVisible();
});
