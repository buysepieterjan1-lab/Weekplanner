import { test, expect, type Page } from '@playwright/test';
import { openApp, pointIn, drag, isMobile, TODAY } from './helpers';

async function newBlock(page: Page, title: string, start: string, end: string, opts: { date?: string; cat?: string } = {}) {
  await page.getByRole('button', { name: '+ Blok' }).click();
  const dlg = page.getByTestId('block-dialog');
  await dlg.getByLabel('Titel').fill(title);
  if (opts.date) await dlg.getByLabel('Datum').fill(opts.date);
  await dlg.getByLabel('Start').fill(start);
  await dlg.getByLabel('Einde', { exact: true }).fill(end);
  if (opts.cat) await dlg.getByLabel('Categorie').selectOption({ label: opts.cat });
  return dlg;
}

const scrollTo = (page: Page, min: number) =>
  page.locator('[data-grid-scroll]').evaluate((el, y) => { el.scrollTop = y; }, min * 1.2);

test('tijden vrij typen, ook 12:01', async ({ page }) => {
  await openApp(page);
  const dlg = await newBlock(page, 'Exacte tijd', '1201', '13.47');
  await expect(dlg.getByTestId('time-hint')).toHaveText('Duur: 1 uur 46 min');
  await dlg.getByLabel('Start').blur();
  await expect(dlg.getByLabel('Start')).toHaveValue('12:01');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  await expect(block).toContainText('12:01');
  await expect(block).toContainText('13:47');
  await block.click();
  await expect(page.getByTestId('block-dialog').getByLabel('Start')).toHaveValue('12:01');
  await expect(page.getByTestId('block-dialog').getByLabel('Einde', { exact: true })).toHaveValue('13:47');
});

test('slapen over middernacht: één blok over twee dagen', async ({ page }) => {
  await openApp(page);
  const dlg = await newBlock(page, 'Slapen', '23:00', '07:00', { cat: 'Slapen' });
  await expect(dlg.getByTestId('time-hint')).toHaveText('Eindigt de volgende dag om 07:00 · 8 uur');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(dlg).toBeHidden();

  // vandaag: 23:00 tot middernacht
  await scrollTo(page, 22 * 60);
  const first = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  await expect(first).toContainText('23:00');
  await expect(first).toContainText('07:00 ↓');

  // volgende dag: 00:00 tot 07:00
  if (isMobile(page)) await page.getByRole('button', { name: 'Volgende periode' }).click();
  await scrollTo(page, 0);
  const next = page.getByTestId('day-2026-11-12').getByTestId('block');
  await expect(next).toContainText('↑ 23:00');
  await expect(next).toContainText('07:00');
  const box = (await next.boundingBox())!;
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(7 * 60 * 1.2 - 4);

  // één vinkje voor beide stukken
  await next.getByTestId('block-check').click();
  await expect(next).toHaveClass(/done/);
  if (isMobile(page)) await page.getByRole('button', { name: 'Vorige periode' }).click();
  await scrollTo(page, 22 * 60);
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toHaveClass(/done/);
});

test('blok over middernacht verslepen via het vervolgstuk', async ({ page }) => {
  test.skip(isMobile(page), 'twee dagen naast elkaar: laptop');
  await openApp(page);
  const dlg = await newBlock(page, 'Slapen', '23:00', '07:00', { cat: 'Slapen' });
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await scrollTo(page, 0);
  const next = page.getByTestId('day-2026-11-12').getByTestId('block');
  const b = (await next.boundingBox())!;
  // vervolgstuk 1 uur later slepen → hele blok 00:00 tot 08:00
  await drag(page, { x: b.x + 20, y: b.y + 30 }, { x: b.x + 20, y: b.y + 30 + 60 * 1.2 });
  await expect(page.getByTestId('day-2026-11-12').getByTestId('block')).toContainText('00:00');
  await expect(page.getByTestId('day-2026-11-12').getByTestId('block')).toContainText('08:00');
  await scrollTo(page, 22 * 60);
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toHaveCount(0);
});

test('slepen rondt af op 10 minuten', async ({ page }) => {
  await openApp(page);
  const col = page.getByTestId(`day-${TODAY}`);
  await drag(page, await pointIn(col, 8 * 60 + 12), await pointIn(col, 9 * 60 + 37));
  const dlg = page.getByTestId('block-dialog');
  await expect(dlg.getByLabel('Start')).toHaveValue('08:10');
  await expect(dlg.getByLabel('Einde', { exact: true })).toHaveValue('09:40');
});
