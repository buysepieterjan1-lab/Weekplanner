import { test, expect } from '@playwright/test';
import { openApp, pointIn, drag, openSide, isMobile, ICS_FIXTURE, TODAY } from './helpers';

test.describe('planner', () => {
  test('standaardweergave: week op laptop, dag op gsm', async ({ page }) => {
    await openApp(page);
    if (isMobile(page)) await expect(page.getByTestId('range')).toHaveText('woensdag 11 november 2026');
    else await expect(page.getByTestId('range')).toHaveText('Week 46 · 9 – 15 nov 2026');
    await expect(page.getByTestId('countdown')).toHaveText('Eerste examen over 55 dagen');
    expect(await page.locator('form').count()).toBe(0);
  });

  test('blok toevoegen met validatie', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '+ Blok' }).click();
    const dlg = page.getByTestId('block-dialog');
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    await expect(dlg.getByTestId('block-error')).toHaveText('Vul een titel in.');
    await dlg.getByLabel('Titel').fill('Boekhouden studeren');
    await dlg.getByLabel('Start').selectOption({ label: '15:00' });
    await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: '14:00' });
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    await expect(dlg.getByTestId('block-error')).toHaveText('Het einde moet na het begin liggen.');
    await dlg.getByLabel('Datum').fill('2027-03-01');
    await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: '17:00' });
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    await expect(dlg.getByTestId('block-error')).toContainText('buiten de planner');
    await dlg.getByLabel('Datum').fill(TODAY);
    await dlg.getByLabel('Categorie').selectOption({ label: 'Studeren' });
    await dlg.getByLabel('Titel').press('Enter'); // Enter slaat op, zonder formulier
    await expect(dlg).toBeHidden();
    const block = page.getByTestId(`day-${TODAY}`).getByTestId('block');
    await expect(block).toContainText('Boekhouden studeren');
    await expect(block).toContainText('15:00');
    await expect(block).toContainText('17:00');
    // blijft bewaard na herladen
    await page.reload();
    await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('Boekhouden studeren');
  });

  test('klik-slepen van 07:00 tot 14:00 maakt een blok', async ({ page }) => {
    await openApp(page);
    const col = page.getByTestId(`day-${TODAY}`);
    const from = await pointIn(col, 7 * 60 + 4);
    const to = await pointIn(col, 14 * 60 - 3);
    await drag(page, from, to);
    const dlg = page.getByTestId('block-dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByLabel('Start')).toHaveValue(String(7 * 60));
    await expect(dlg.getByLabel('Einde', { exact: true })).toHaveValue(String(14 * 60));
    await dlg.getByLabel('Titel').fill('Lange studiedag');
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    const block = col.getByTestId('block');
    await expect(block).toContainText('07:00');
    await expect(block).toContainText('14:00');
    const box = (await block.boundingBox())!;
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(7 * 60 * 1.2 - 4); // evenredig met de duur
  });

  test('blok verslepen naar een andere dag en tijd', async ({ page }) => {
    test.skip(isMobile(page), 'gsm toont één dag; verplaatsen binnen de dag wordt hieronder getest');
    await openApp(page);
    await page.getByRole('button', { name: '+ Blok' }).click();
    const dlg = page.getByTestId('block-dialog');
    await dlg.getByLabel('Titel').fill('Fietsen');
    await dlg.getByLabel('Datum').fill('2026-11-10');
    await dlg.getByLabel('Start').selectOption({ label: '08:00' });
    await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: '09:00' });
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    const block = page.getByTestId('day-2026-11-10').getByTestId('block');
    const b = (await block.boundingBox())!;
    const target = await pointIn(page.getByTestId('day-2026-11-12'), 10 * 60 + 5);
    await drag(page, { x: b.x + 20, y: b.y + 5 }, { x: target.x, y: target.y + 5 });
    await expect(page.getByTestId('day-2026-11-10').getByTestId('block')).toHaveCount(0);
    await expect(page.getByTestId('day-2026-11-12').getByTestId('block')).toContainText('10:00');
    await expect(page.getByTestId('day-2026-11-12').getByTestId('block')).toContainText('11:00');
  });

  test('blok verplaatsen op gsm (lang indrukken)', async ({ page }) => {
    test.skip(!isMobile(page), 'enkel gsm');
    await openApp(page);
    const col = page.getByTestId(`day-${TODAY}`);
    await page.getByRole('button', { name: '+ Blok' }).click();
    const dlg = page.getByTestId('block-dialog');
    await dlg.getByLabel('Titel').fill('Fietsen');
    await dlg.getByLabel('Start').selectOption({ label: '08:00' });
    await dlg.getByLabel('Einde', { exact: true }).selectOption({ label: '09:00' });
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    const b = (await col.getByTestId('block').boundingBox())!;
    await drag(page, { x: b.x + 30, y: b.y + 10 }, { x: b.x + 30, y: b.y + 10 + 120 * 1.2 });
    await expect(col.getByTestId('block')).toContainText('10:00');
    await expect(col.getByTestId('block')).toContainText('11:00');
  });

  test('lijst naar de planner slepen en checklist afvinken', async ({ page }) => {
    await openApp(page);
    await openSide(page);
    const chip = page.getByTestId('template-ochtendroutine');
    const c = (await chip.boundingBox())!;
    const col = page.getByTestId(`day-${TODAY}`);
    const to = await pointIn(col, 8 * 60 + 2, 0.7);
    await drag(page, { x: c.x + 20, y: c.y + c.height / 2 }, to);
    const block = col.getByTestId('block');
    await expect(block).toContainText('Ochtendroutine');
    await expect(block).toContainText('08:00');
    await expect(block).toContainText('08:20');
    await expect(block).toContainText('0/7 klaar');

    await block.click();
    const dlg = page.getByTestId('checklist-dialog');
    await dlg.getByLabel('Lenzen aandoen').check();
    await dlg.getByLabel('Tanden poetsen').check();
    await expect(dlg.getByTestId('checklist-progress')).toHaveText('2/7 klaar');
    await dlg.getByRole('button', { name: 'Sluiten' }).click();
    await expect(block).toContainText('2/7 klaar');

    await page.reload();
    await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block')).toContainText('2/7 klaar');
    await page.getByTestId(`day-${TODAY}`).getByTestId('block').click();
    await page.getByTestId('checklist-dialog').getByRole('button', { name: 'Blok bewerken' }).click();
    await expect(page.getByTestId('block-dialog').getByLabel('Titel')).toHaveValue('Ochtendroutine');
  });

  test('klik op een lijst toont de inhoud', async ({ page }) => {
    await openApp(page);
    await openSide(page);
    await page.getByTestId('template-unief').click();
    const dlg = page.getByTestId('list-dialog');
    await expect(dlg).toContainText('Boekentas');
    await expect(dlg).toContainText('Voorzakje');
    await expect(dlg).toContainText('Broekzak');
    await expect(dlg).toContainText('Evt. kauwgompotje');
  });

  test('taak toevoegen en naar een dag slepen maakt een blok van 1 uur', async ({ page }) => {
    await openApp(page);
    await openSide(page);
    await page.getByLabel('Nieuwe taak').fill('Oefeningen wiskunde');
    await page.getByLabel('Nieuwe taak').press('Enter');
    const item = page.getByTestId('todo-list').locator('li', { hasText: 'Oefeningen wiskunde' });
    await expect(item).toBeVisible();
    const box = (await item.locator('label').boundingBox())!;
    const col = page.getByTestId(`day-${TODAY}`);
    const to = await pointIn(col, 13 * 60 + 3, 0.7);
    await drag(page, { x: box.x + 10, y: box.y + box.height / 2 }, to);
    await expect(col.getByTestId('block')).toContainText('Oefeningen wiskunde');
    await expect(col.getByTestId('block')).toContainText('13:00');
    await expect(col.getByTestId('block')).toContainText('14:00');
  });

  test('ICS importeren: 64 blokken, 10 examens, eigen blokken blijven', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '+ Blok' }).click();
    await page.getByTestId('block-dialog').getByLabel('Titel').fill('Eigen blok');
    await page.getByTestId('block-dialog').getByRole('button', { name: 'Opslaan' }).click();

    await page.getByRole('button', { name: 'Instellingen' }).click();
    const s = page.getByTestId('settings-dialog');
    await s.getByTestId('ics-input').setInputFiles(ICS_FIXTURE);
    await expect(s.getByTestId('ics-msg')).toContainText('64 blokken geïmporteerd (van 213 afspraken), waarvan 10 examens');
    // opnieuw importeren vervangt, verdubbelt niet
    await s.getByTestId('ics-input').setInputFiles(ICS_FIXTURE);
    await expect(s.getByTestId('ics-msg')).toContainText('64 blokken');
    // ongeldig bestand: niets gewijzigd
    await s.getByTestId('ics-input').setInputFiles({ name: 'kapot.ics', mimeType: 'text/calendar', buffer: Buffer.from('dit is geen agenda') });
    await expect(s.getByTestId('ics-msg')).toContainText('Import mislukt, er is niets gewijzigd');
    await s.getByRole('button', { name: 'Sluiten' }).click();

    await page.getByRole('button', { name: 'Maand', exact: true }).click();
    await page.getByRole('button', { name: /maandag 9 november 2026: 4 blokken/ }).click();
    const col = page.getByTestId('day-2026-11-09');
    await expect(col.getByTestId('block').first()).toContainText('Economie A');
    await expect(col.getByTestId('block').first()).toContainText('09:00');
    await expect(col.getByTestId('block').first()).toContainText('Auditorium A - Adolphe Quetelet');
    await expect(page.getByTestId(`day-${TODAY}`)).toBeHidden();
    await page.getByRole('button', { name: 'Vandaag' }).click();
    await expect(page.getByTestId(`day-${TODAY}`).getByTestId('block').filter({ hasText: 'Eigen blok' })).toHaveCount(1);
  });

  test('navigatie stopt op 7 februari 2027', async ({ page }) => {
    await openApp(page, '2027-01-20T10:00:00+01:00');
    await page.getByRole('button', { name: 'Week', exact: true }).click();
    const next = page.getByRole('button', { name: 'Volgende periode' });
    for (let i = 0; i < 10 && (await next.isEnabled()); i++) await next.click();
    await expect(next).toBeDisabled();
    await expect(page.getByTestId('range')).toHaveText('Week 5 · 1 – 7 feb 2027');
    await page.getByRole('button', { name: 'Dag', exact: true }).click();
    await page.getByRole('button', { name: 'Maand', exact: true }).click();
    await expect(page.getByTestId('range')).toHaveText('Februari 2027');
    await expect(next).toBeDisabled();
    await expect(page.getByRole('button', { name: /maandag 8 februari 2027/ })).toBeDisabled();
    await page.getByRole('button', { name: /zondag 7 februari 2027/ }).click();
    await expect(page.getByTestId('range')).toHaveText('zondag 7 februari 2027');
    await expect(next).toBeDisabled();
  });

  test('categorie verwijderen zet blokken op Overig; Overig kan niet weg', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '+ Blok' }).click();
    const dlg = page.getByTestId('block-dialog');
    await dlg.getByLabel('Titel').fill('Rit naar Gent');
    await dlg.getByLabel('Categorie').selectOption({ label: 'Fietsen' });
    await dlg.getByRole('button', { name: 'Opslaan' }).click();
    await page.getByRole('button', { name: 'Instellingen' }).click();
    const s = page.getByTestId('settings-dialog');
    await expect(s.getByRole('button', { name: 'Categorie Overig verwijderen' })).toBeDisabled();
    await s.getByRole('button', { name: 'Categorie Fietsen verwijderen' }).click();
    await page.getByTestId('confirm-dialog').getByRole('button', { name: 'Verwijderen' }).click();
    await s.getByRole('button', { name: 'Sluiten' }).click();
    await page.getByTestId(`day-${TODAY}`).getByTestId('block').click();
    await expect(page.getByTestId('block-dialog').getByLabel('Categorie')).toHaveValue('overig');
  });

  test('werkt in een ingesloten venster zonder formulierverzending', async ({ page, baseURL }) => {
    await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+01:00`));
    // gastpagina op dezelfde origin die de app insluit zonder allow-forms/allow-modals
    await page.route('**/host.html', r => r.fulfill({ contentType: 'text/html',
      body: `<!doctype html><iframe id="f" src="${baseURL}" sandbox="allow-scripts allow-same-origin" style="width:100%;height:95vh;border:0"></iframe>` }));
    await page.goto('/host.html');
    const f = page.frameLocator('#f');
    await expect(f.locator('[data-ready=true]')).toBeVisible();
    await f.getByRole('button', { name: '+ Blok' }).click();
    await f.getByTestId('block-dialog').getByLabel('Titel').fill('In iframe');
    await f.getByTestId('block-dialog').getByLabel('Titel').press('Enter');
    await expect(f.getByTestId('block-dialog')).toBeHidden();
    await expect(f.getByTestId('block').filter({ hasText: 'In iframe' })).toBeVisible();
    // bevestigen via eigen dialoog (window.confirm is hier geblokkeerd)
    await f.getByTestId('block').filter({ hasText: 'In iframe' }).click();
    await f.getByTestId('block-dialog').getByRole('button', { name: 'Verwijderen' }).click();
    await f.getByTestId('confirm-dialog').getByRole('button', { name: 'Verwijderen' }).click();
    await expect(f.getByTestId('block')).toHaveCount(0);
    expect(await f.locator('form').count()).toBe(0);
  });
});
