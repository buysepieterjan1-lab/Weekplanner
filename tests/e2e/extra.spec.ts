import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openApp, pointIn, drag, isMobile, TODAY } from './helpers';

async function addBlock(page: import('@playwright/test').Page, title: string, start: string, end: string, opts: { date?: string; weekly?: boolean } = {}) {
  await page.getByRole('button', { name: '+ Blok' }).click();
  const dlg = page.getByTestId('block-dialog');
  await dlg.getByLabel('Titel').fill(title);
  if (opts.date) await dlg.getByLabel('Datum').fill(opts.date);
  await dlg.getByLabel('Start').selectOption({ label: start });
  await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: end });
  if (opts.weekly) await dlg.getByLabel(/Wekelijks herhalen/).check();
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await expect(dlg).toBeHidden();
}

test('onderrand slepen wijzigt de duur (afgerond op kwartier)', async ({ page }) => {
  await openApp(page);
  await addBlock(page, 'Werk frituur', '08:00', '09:00');
  const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  const b = (await block.boundingBox())!;
  const from = { x: b.x + b.width / 2, y: b.y + b.height - 3 };
  // naar 10:41 slepen → afgerond 10:45 (op gsm: vinger, meteen actief)
  const to = { x: from.x, y: (await pointIn(page.getByTestId(`day-${TODAY}`), 10 * 60 + 41)).y };
  if (isMobile(page)) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y + ((to.y - from.y) * i) / 8, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await drag(page, from, to);
  }
  await expect(block).toContainText('10:45');
  await expect(page.getByTestId('block-dialog')).toBeHidden();
});

test('wekelijks herhalen: wijziging geldt voor alle herhalingen', async ({ page }) => {
  await openApp(page);
  await addBlock(page, 'Frituur', '18:00', '22:00', { weekly: true });
  await page.getByRole('button', { name: 'Volgende periode' }).click();
  const next = isMobile(page) ? '2026-11-12' : '2026-11-18';
  if (!isMobile(page)) await expect(page.getByTestId(`day-${next}`).getByTestId('block')).toContainText('Frituur');
  await page.getByRole('button', { name: 'Maand', exact: true }).click();
  await expect(page.getByRole('button', { name: /woensdag 25 november 2026: 1 blok$/ })).toBeVisible();
  await page.getByRole('button', { name: /woensdag 25 november 2026/ }).click();
  await page.getByTestId('day-2026-11-25').getByTestId('block').click();
  const dlg = page.getByTestId('block-dialog');
  await expect(dlg).toContainText('Wijzigingen gelden voor alle herhalingen');
  await expect(dlg.getByLabel('Datum')).toHaveValue('2026-11-25');
  await dlg.getByLabel('Titel').fill('Frituur Gent');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await page.getByRole('button', { name: 'Vandaag' }).click();
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('Frituur Gent');
  // na de eindgrens geen herhalingen meer
  await page.getByRole('button', { name: 'Maand', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Volgende periode' }).click();
  await expect(page.getByTestId('range')).toHaveText('Februari 2027');
  await expect(page.getByRole('button', { name: /woensdag 3 februari 2027: 1 blok$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /woensdag 10 februari 2027/ })).toBeDisabled();
});

test('bediening met het toetsenbord', async ({ page }) => {
  test.skip(isMobile(page), 'toetsenbord: laptop');
  await openApp(page);
  await addBlock(page, 'Lezen', '10:00', '11:00');
  const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
  await block.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('10:15');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('11:30');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('day-2026-11-12').getByTestId('block')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('block-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('block-dialog')).toBeHidden();
});

test('back-up exporteren en terugzetten', async ({ page }) => {
  await openApp(page);
  await addBlock(page, 'Back-up blok', '12:00', '13:00');
  await page.getByRole('button', { name: 'Instellingen' }).click();
  const s = page.getByTestId('settings-dialog');
  const dl = page.waitForEvent('download');
  await s.getByRole('button', { name: 'Exporteren (JSON)' }).click();
  const file = await (await dl).path();
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.schemaVersion).toBe(1);
  expect(json.blocks[0].title).toBe('Back-up blok');

  // ongeldige back-up: niets gewijzigd
  await s.getByTestId('json-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"kapot":') });
  await expect(s).toContainText('Import mislukt, er is niets gewijzigd');

  json.blocks[0].title = 'Teruggezet blok';
  await s.getByTestId('json-input').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
  await page.getByTestId('confirm-dialog').getByRole('button', { name: 'Vervangen' }).click();
  await expect(s).toContainText('Back-up geladen: 1 blokken');
  await s.getByRole('button', { name: 'Sluiten' }).click();
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('Teruggezet blok');
});

test('achtergrondaccenten aan en uit', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.decor')).toHaveCount(1);
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByLabel(/Achtergrondaccenten tonen/).uncheck();
  await expect(page.locator('.decor')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-ready=true]')).toBeVisible();
  await expect(page.locator('.decor')).toHaveCount(0);
});

test('examen-aftelling en eindgrens zijn instelbaar', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByLabel('Eerste examendag').fill('2026-11-21');
  await page.getByLabel('Eerste examendag').blur();
  await expect(page.getByTestId('countdown')).toHaveText('Eerste examen over 10 dagen');
  await page.getByLabel('Planner loopt tot en met').fill('2026-11-15');
  await page.getByLabel('Planner loopt tot en met').blur();
  await page.getByTestId('settings-dialog').getByRole('button', { name: 'Sluiten' }).click();
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Volgende periode' })).toBeDisabled();
});

test('werkt offline na de eerste keer laden (PWA)', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // service worker neemt de pagina over
  await expect(page.locator('[data-ready=true]')).toBeVisible();
  await addBlock(page, 'Offline blok', '16:00', '17:00');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-ready=true]')).toBeVisible();
  await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('Offline blok');
  await context.setOffline(false);
});

test('manifest is installeerbaar', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ display: 'standalone', lang: 'nl-BE' });
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await openApp(page);
  await expect(page.locator('link[rel=manifest]')).toHaveCount(1);
});
