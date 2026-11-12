<script lang="ts">
  import Modal from './Modal.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { addCategory, deleteCategory, replaceImported } from '../lib/planner/ops';
  import { validateCategoryName } from '../lib/validate';
  import { OVERIG_ID } from '../lib/model/defaults';
  import { importTimeEdit } from '../lib/ics/timeedit';
  import { IcsError } from '../lib/ics/parse';
  import { exportJson, importJson, backupFileName } from '../lib/backup/backup';
  import { formatLong, isDateKey, todayKey } from '../lib/time/dates';

  let newName = $state('');
  let newColor = $state('#0ea5e9');
  let catError = $state('');
  let icsMsg = $state<{ text: string; tone: 'ok' | 'error' } | null>(null);
  let backupMsg = $state<{ text: string; tone: 'ok' | 'error' } | null>(null);
  let dateError = $state('');
  let icsInput: HTMLInputElement;
  let jsonInput: HTMLInputElement;

  const s = $derived(store.data.settings);

  function addCat() {
    catError = validateCategoryName(newName, store.data.categories.map(c => c.name)) ?? '';
    if (catError) return;
    store.change(d => addCategory(d, newName, newColor));
    newName = '';
  }

  function rename(id: string, e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const others = store.data.categories.filter(c => c.id !== id).map(c => c.name);
    const err = validateCategoryName(input.value, others);
    const cat = store.data.categories.find(c => c.id === id)!;
    if (err) { catError = err; input.value = cat.name; return; }
    catError = '';
    store.change(d => { d.categories.find(c => c.id === id)!.name = input.value.trim(); });
  }

  async function removeCat(id: string, name: string) {
    if (!(await ui.confirm(`Categorie "${name}" verwijderen? Blokken en taken van deze categorie gaan naar Overig.`))) return;
    store.change(d => { deleteCategory(d, id); });
  }

  function setDate(key: 'examDate' | 'endDate', value: string) {
    if (!isDateKey(value)) { dateError = 'Kies een geldige datum.'; return; }
    dateError = '';
    store.change(d => { d.settings[key] = value; });
    if (key === 'endDate' && ui.current > value) ui.current = value;
  }

  async function onIcs() {
    const f = icsInput.files?.[0];
    icsInput.value = '';
    if (!f) return;
    try {
      const r = importTimeEdit(await f.text(), s.endDate);
      if (!r.blocks.length) throw new IcsError(`Er staan geen afspraken in dit bestand tot en met ${formatLong(s.endDate)}.`);
      store.change(d => replaceImported(d, r.blocks));
      icsMsg = { tone: 'ok', text: `${r.blocks.length} blokken geïmporteerd (van ${r.eventCount} afspraken), waarvan ${r.examCount} examens, tot en met ${formatLong(s.endDate)}. Vorige import vervangen; je eigen blokken blijven staan.` };
    } catch (e) {
      icsMsg = { tone: 'error', text: `Import mislukt, er is niets gewijzigd. ${e instanceof IcsError ? e.message : 'Dit bestand kon niet gelezen worden als TimeEdit-rooster.'}` };
    }
  }

  function exportBackup() {
    const blob = new Blob([exportJson(store.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName(todayKey());
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    backupMsg = { tone: 'ok', text: 'Back-up gedownload.' };
  }

  async function onJson() {
    const f = jsonInput.files?.[0];
    jsonInput.value = '';
    if (!f) return;
    try {
      const data = importJson(await f.text());
      if (!(await ui.confirm('Al je huidige gegevens vervangen door deze back-up?', 'Vervangen'))) return;
      store.replace(data);
      backupMsg = { tone: 'ok', text: `Back-up geladen: ${data.blocks.length} blokken, ${data.todos.length} taken.` };
    } catch (e) {
      backupMsg = { tone: 'error', text: `Import mislukt, er is niets gewijzigd. ${(e as Error).message}` };
    }
  }
</script>

<Modal title="Instellingen" onclose={() => ui.close()} testid="settings-dialog">
  <section aria-labelledby="set-cat">
    <h3 id="set-cat">Categorieën</h3>
    <p class="hint">Vink "✓-lijst" aan om blokken van die categorie in de afvinklijst te zetten.</p>
    <ul class="cat-list">
      {#each store.data.categories as c (c.id)}
        <li>
          <input type="color" value={c.color} aria-label="Kleur van {c.name}"
            onchange={e => { const v = (e.currentTarget as HTMLInputElement).value; store.change(d => { d.categories.find(x => x.id === c.id)!.color = v; }); }} />
          <input type="text" value={c.name} maxlength="30" aria-label="Naam van categorie {c.name}"
            onchange={e => rename(c.id, e)} onkeydown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />
          <label class="cat-todo" title="Blokken van deze categorie komen in de afvinklijst">
            <input type="checkbox" checked={!!c.inChecklist} aria-label="{c.name} in de afvinklijst"
              onchange={e => { const v = (e.currentTarget as HTMLInputElement).checked; store.change(d => { d.categories.find(x => x.id === c.id)!.inChecklist = v; }); }} />
            <span aria-hidden="true">✓-lijst</span>
          </label>
          <button type="button" class="danger" disabled={c.id === OVERIG_ID} onclick={() => removeCat(c.id, c.name)}
            aria-label="Categorie {c.name} verwijderen" title={c.id === OVERIG_ID ? 'Overig kan niet verwijderd worden' : 'Verwijderen'}>Verwijderen</button>
        </li>
      {/each}
    </ul>
    <div class="cat-add">
      <input type="color" bind:value={newColor} aria-label="Kleur nieuwe categorie" />
      <input type="text" bind:value={newName} placeholder="Nieuwe categorie" maxlength="30" aria-label="Naam nieuwe categorie"
        onkeydown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} />
      <button type="button" class="primary" onclick={addCat}>Toevoegen</button>
    </div>
    {#if catError}<p class="err" role="alert">{catError}</p>{/if}
  </section>

  <section aria-labelledby="set-gen">
    <h3 id="set-gen">Algemeen</h3>
    <label class="check"><input type="checkbox" checked={s.decor} onchange={e => { const v = (e.currentTarget as HTMLInputElement).checked; store.change(d => { d.settings.decor = v; }); }} /> Achtergrondaccenten tonen (takjes, bergjes, diertjes)</label>
    <div class="row2">
      <div>
        <label for="set-exam">Eerste examendag</label>
        <input id="set-exam" type="date" value={s.examDate} onchange={e => setDate('examDate', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div>
        <label for="set-end">Planner loopt tot en met</label>
        <input id="set-end" type="date" value={s.endDate} onchange={e => setDate('endDate', (e.currentTarget as HTMLInputElement).value)} />
      </div>
    </div>
    {#if dateError}<p class="err" role="alert">{dateError}</p>{/if}
  </section>

  <section aria-labelledby="set-ics">
    <h3 id="set-ics">Lessen (TimeEdit)</h3>
    <p class="hint">Importeer je rooster als .ics. Afspraken tot en met {formatLong(s.endDate)} komen erin. Een nieuwe import vervangt de vorige; je eigen blokken blijven staan.</p>
    <button type="button" onclick={() => icsInput.click()}>Importeer .ics</button>
    <input bind:this={icsInput} type="file" accept=".ics,text/calendar" hidden data-testid="ics-input" onchange={onIcs} />
    {#if icsMsg}<p class={icsMsg.tone === 'ok' ? 'ok' : 'err'} role="status" data-testid="ics-msg">{icsMsg.text}</p>{/if}
  </section>

  <section aria-labelledby="set-backup">
    <h3 id="set-backup">Back-up</h3>
    <div class="row">
      <button type="button" onclick={exportBackup}>Exporteren (JSON)</button>
      <button type="button" onclick={() => jsonInput.click()}>Importeren</button>
      <input bind:this={jsonInput} type="file" accept="application/json,.json" hidden data-testid="json-input" onchange={onJson} />
    </div>
    {#if backupMsg}<p class={backupMsg.tone === 'ok' ? 'ok' : 'err'} role="status">{backupMsg.text}</p>{/if}
    <p class="hint">Je gegevens staan enkel op dit toestel ({store.mode}).</p>
  </section>

  {#snippet footer()}
    <span class="spacer"></span>
    <button type="button" class="primary" onclick={() => ui.close()}>Sluiten</button>
  {/snippet}
</Modal>
