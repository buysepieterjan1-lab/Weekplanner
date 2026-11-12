import { test, expect, type Page } from '@playwright/test';
import { openApp, pointIn, drag, openSide, isMobile, TODAY } from './helpers';

async function newBlock(page: Page, title: string, start: string, end: string, cat?: string) {
  await page.getByRole('button', { name: '+ Blok' }).click();
  const dlg = page.getByTestId('block-dialog');
  await dlg.getByLabel('Titel').fill(title);
  await dlg.getByLabel('Start').selectOption({ label: start });
  await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: end });
  if (cat) await dlg.getByLabel('Categorie').selectOption({ label: cat });
  return dlg;
}

async function showSide(page: Page) {
  await openSide(page);
}

test('teller toont uur en minuten; nieuwe categorieën bestaan', async ({ page }) => {
  await openApp(page);
  const dlg = await newBlock(page, 'Eco A', '09:00', '10:30', 'Studeren');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await showSide(page);
  const counter = page.getByTestId('counter');
  await expect(counter.locator('li', { hasText: 'Studeren' }).first()).toContainText('1 blok · 1 uur 30 min');
  for (const n of ['Slapen', 'Pauze tijdens studeren', 'Verplaatsing naar campus', 'Unief meepakken']) {
    await expect(counter.locator('.c-name', { hasText: n })).toHaveCount(1);
  }
});

test('elke dag herhalen tot een zelfgekozen datum', async ({ page }) => {
  await openApp(page);
  const dlg = await newBlock(page, 'Opstaan', '07:00', '07:15');
  await dlg.locator('#b-repeat').selectOption('daily');
  await dlg.getByLabel('Tot en met').fill('2026-11-13');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await page.getByRole('button', { name: 'Maand', exact: true }).click();
  await expect(page.getByRole('button', { name: /donderdag 12 november 2026: 1 blok$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /vrijdag 13 november 2026: 1 blok$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /zaterdag 14 november 2026: 0 blokken/ })).toBeVisible();
});

test('gekozen weekdagen en mini-kalender', async ({ page }) => {
  await openApp(page);
  let dlg = await newBlock(page, 'Fitness', '18:00', '19:00');
  await dlg.locator('#b-repeat').selectOption('weekdays');
  await dlg.getByRole('button', { name: 'vrijdag' }).click();
  await dlg.getByRole('button', { name: 'Opslaan' }).click();

  dlg = await newBlock(page, 'Bib', '13:00', '15:00');
  await dlg.locator('#b-repeat').selectOption('dates');
  const cal = dlg.getByTestId('mini-calendar');
  await cal.getByRole('button', { name: 'Volgende maand' }).click();
  await cal.getByRole('button', { name: /maandag 7 december 2026/ }).click();
  await expect(cal.getByRole('button', { name: /maandag 7 december 2026/ })).toHaveAttribute('aria-pressed', 'true');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();

  await page.getByRole('button', { name: 'Maand', exact: true }).click();
  await expect(page.getByRole('button', { name: /woensdag 18 november 2026: 1 blok$/ })).toBeVisible(); // fitness wo
  await expect(page.getByRole('button', { name: /vrijdag 20 november 2026: 1 blok$/ })).toBeVisible(); // fitness vr
  await expect(page.getByRole('button', { name: /donderdag 19 november 2026: 0 blokken/ })).toBeVisible();
  await page.getByRole('button', { name: 'Volgende periode' }).click();
  await expect(page.getByRole('button', { name: /maandag 7 december 2026: 1 blok$/ })).toBeVisible(); // bib
});

test('blok afvinken: doorstreept en in de afvinklijst met percentage', async ({ page }) => {
  await openApp(page);
  let dlg = await newBlock(page, 'Eco A', '09:00', '10:00', 'Studeren');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  dlg = await newBlock(page, 'Frituur', '18:00', '22:00', 'Werk (frituur)');
  await dlg.getByLabel('In de afvinklijst zetten').check();
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  dlg = await newBlock(page, 'Lessen', '11:00', '12:00', 'Lessen');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();

  await showSide(page);
  const list = page.getByTestId('afvinklijst');
  await expect(list.getByTestId('afvink-list').locator('li')).toHaveCount(2);
  await expect(list.getByTestId('afvink-pct')).toHaveText('0%');
  await list.getByLabel(/Eco A/).check();
  await expect(list.getByTestId('afvink-pct')).toHaveText('50%');
  if (isMobile(page)) await page.getByRole('button', { name: 'Sluiten', exact: true }).click();

  const eco = page.getByTestId(`day-${TODAY}`).getByTestId('block').filter({ hasText: 'Eco A' });
  await expect(eco).toHaveClass(/done/);
  // via het vakje in het blok zelf
  const frit = page.getByTestId(`day-${TODAY}`).getByTestId('block').filter({ hasText: 'Frituur' });
  await page.getByTestId(`day-${TODAY}`).evaluate(() => {
    const s = document.querySelector('[data-grid-scroll]')!; s.scrollTop = 17 * 60 * 1.2;
  });
  await frit.getByTestId('block-check').click();
  await expect(frit).toHaveClass(/done/);
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block-dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-ready=true]')).toBeVisible();
  await showSide(page);
  await expect(page.getByTestId('afvink-pct')).toHaveText('100%');
});

test('ingeplande taak komt in de afvinklijst', async ({ page }) => {
  await openApp(page);
  await openSide(page);
  await page.getByLabel('Nieuwe taak').fill('Eco A herhalen');
  await page.getByLabel('Nieuwe taak').press('Enter');
  const item = page.getByTestId('todo-list').locator('li', { hasText: 'Eco A herhalen' });
  const box = (await item.locator('label').boundingBox())!;
  const to = await pointIn(page.getByTestId(`day-${TODAY}`), 14 * 60 + 2, 0.7);
  await drag(page, { x: box.x + 10, y: box.y + box.height / 2 }, to);
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('Eco A herhalen');
  await openSide(page);
  await expect(page.getByTestId('afvink-list')).toContainText('Eco A herhalen');
});

test('eigen lijst maken en naar de planner slepen', async ({ page }) => {
  await openApp(page);
  await openSide(page);
  await page.getByRole('button', { name: '+ Nieuwe lijst' }).click();
  const ed = page.getByTestId('list-editor');
  await ed.getByRole('button', { name: 'Opslaan' }).click();
  await expect(ed).toContainText('Geef de lijst een naam.');
  await ed.getByLabel('Naam').fill('Half uur Eco A');
  await ed.getByLabel('Duur').selectOption({ label: '30 min' });
  await ed.getByLabel('Categorie').selectOption({ label: 'Studeren' });
  await ed.getByLabel(/Checklist/).fill('Samenvatting H3\nOefeningen 1–5');
  await ed.getByRole('button', { name: 'Opslaan' }).click();
  await expect(ed).toBeHidden();
  const chip = page.locator('.chip', { hasText: 'Half uur Eco A' });
  await expect(chip).toContainText('30 min');
  const c = (await chip.boundingBox())!;
  const to = await pointIn(page.getByTestId(`day-${TODAY}`), 10 * 60 + 2, 0.7);
  await drag(page, { x: c.x + 15, y: c.y + c.height / 2 }, to);
  const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  await expect(block).toContainText('Half uur Eco A');
  await expect(block).toContainText('10:30');
  await expect(block).toContainText('0/2 klaar');
});

test('inzoomen en uitzoomen', async ({ page }) => {
  await openApp(page);
  const dlg = await newBlock(page, 'Zoomtest', '09:00', '10:00');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  const h1 = (await block.boundingBox())!.height;
  await page.getByRole('button', { name: 'Inzoomen' }).click();
  await expect.poll(async () => (await block.boundingBox())!.height).toBeGreaterThan(h1 * 1.3);
  await page.getByRole('button', { name: 'Uitzoomen' }).click();
  await page.getByRole('button', { name: 'Uitzoomen' }).click();
  await expect.poll(async () => (await block.boundingBox())!.height).toBeLessThan(h1);
  await expect(page.getByRole('button', { name: 'Uitzoomen' })).toBeDisabled();
});

for (const width of [1280, 1366]) {
  test(`weekweergave toont zondag zonder te scrollen (${width}px)`, async ({ page }) => {
    test.skip(isMobile(page), 'laptop');
    await page.setViewportSize({ width, height: 800 });
    await openApp(page);
    const sun = page.getByRole('button', { name: /Open zondag 15 november 2026/ });
    await expect(sun).toBeInViewport({ ratio: 1 });
    const scroll = await page.locator('[data-grid-scroll]').evaluate(el => el.scrollWidth - el.clientWidth);
    expect(scroll).toBeLessThanOrEqual(1);
  });
}
