import { expect, type Page, type Locator } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export const PX = 1.2;
export const TODAY = '2026-11-11';

export const ICS_FIXTURE = (() => {
  const real = fileURLToPath(new URL('../fixtures/rooster.ics', import.meta.url));
  return existsSync(real) ? real : fileURLToPath(new URL('../fixtures/rooster-anon.ics', import.meta.url));
})();

export async function openApp(page: Page, now = `${TODAY}T10:00:00+01:00`) {
  await page.clock.setFixedTime(new Date(now));
  await page.goto('/');
  await expect(page.locator('[data-ready=true]')).toBeVisible();
}

export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1000) <= 760;
}

/** Schermcoördinaat van een tijdstip in een dagkolom. */
export async function pointIn(col: Locator, minutes: number, xFrac = 0.5) {
  const box = (await col.boundingBox())!;
  return { x: box.x + box.width * xFrac, y: box.y + minutes * PX };
}

/** Muis: indrukken, slepen, loslaten. */
export async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
  await page.mouse.up();
}

/** Vinger: lang indrukken, slepen, loslaten (echte touch-events via CDP). */
export async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, hold = 650) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  await page.waitForTimeout(hold);
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: pt(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12),
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  if (isMobile(page)) await touchDrag(page, from, to);
  else await mouseDrag(page, from, to);
}

/** Lijsten/todo staan op gsm in een lade. */
export async function openSide(page: Page) {
  if (!isMobile(page)) return;
  await page.getByRole('button', { name: 'Lijsten, taken en teller' }).click();
  // wachten tot de lade volledig ingeschoven is (animatie)
  await page.waitForFunction(() => {
    const el = document.getElementById('side-drawer');
    return !!el && el.getBoundingClientRect().left >= 0 && getComputedStyle(el).transform === 'none';
  });
}
