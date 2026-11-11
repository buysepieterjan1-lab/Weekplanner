<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from './Modal.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui, type BlockDraft } from '../lib/store/ui.svelte';
  import { validateBlock } from '../lib/validate';
  import { addBlock, updateBlock, deleteBlock, type BlockFields } from '../lib/planner/ops';
  import { QUARTER_OPTIONS } from '../lib/actions';
  import { hm } from '../lib/time/quarter';
  import { formatLong, type DateKey } from '../lib/time/dates';

  let { blockId, occurrenceDate, draft }: { blockId: string | null; occurrenceDate?: DateKey; draft?: BlockDraft } = $props();

  // De dialoog werkt met een kopie van de beginwaarden.
  const init = untrack(() => ({ blockId, occurrenceDate, draft }));
  const existing = store.data.blocks.find(b => b.id === init.blockId) ?? null;
  const end = store.data.settings.endDate;

  let title = $state(existing?.title ?? '');
  let date = $state<string>(init.occurrenceDate ?? existing?.date ?? init.draft?.date ?? ui.current);
  let start = $state<number>(existing?.start ?? init.draft?.start ?? 540);
  let stop = $state<number>(existing?.end ?? init.draft?.end ?? 600);
  let categoryId = $state(existing?.categoryId ?? store.data.categories[0]?.id ?? 'overig');
  let location = $state(existing?.location ?? '');
  let notes = $state(existing?.notes ?? '');
  let repeatWeekly = $state(existing?.repeatWeekly ?? false);
  let error = $state('');

  // tijden die niet op een kwartier vallen toch kunnen tonen
  const options = $derived.by(() => {
    const extra = [start, stop].filter(v => v % 15 !== 0).map(v => ({ value: v, label: hm(v) }));
    return [...QUARTER_OPTIONS, ...extra].sort((a, b) => a.value - b.value);
  });

  function save() {
    error = validateBlock({ title, date, start, end: stop }, end) ?? '';
    if (error) return;
    const f: BlockFields = { title, date, start, end: stop, categoryId, location: location.trim(), notes: notes.trim(), repeatWeekly };
    if (existing) store.change(d => updateBlock(d, existing.id, f, init.occurrenceDate));
    else store.change(d => { addBlock(d, f); });
    ui.current = date;
    ui.close();
  }

  async function remove() {
    if (!existing) return;
    const ok = await ui.confirm(existing.repeatWeekly ? 'Dit blok en alle herhalingen verwijderen?' : 'Dit blok verwijderen?');
    if (!ok) return;
    store.change(d => deleteBlock(d, existing.id));
    ui.close();
  }

  function enter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); save(); }
  }
</script>

<Modal title={existing ? 'Blok bewerken' : 'Nieuw blok'} onclose={() => ui.close()} testid="block-dialog">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fields" onkeydown={enter}>
    <label for="b-title">Titel</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="b-title" type="text" bind:value={title} maxlength="120" autofocus aria-invalid={error === 'Vul een titel in.'} />

    <div class="row3">
      <div>
        <label for="b-date">Datum</label>
        <input id="b-date" type="date" bind:value={date} max={end} />
      </div>
      <div>
        <label for="b-start">Start</label>
        <select id="b-start" bind:value={start}>
          {#each options.filter(o => o.value < 1440) as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </div>
      <div>
        <label for="b-end">Einde</label>
        <select id="b-end" bind:value={stop}>
          {#each options.filter(o => o.value > 0) as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </div>
    </div>

    <label for="b-cat">Categorie</label>
    <select id="b-cat" bind:value={categoryId}>
      {#each store.data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>

    <label for="b-loc">Locatie</label>
    <input id="b-loc" type="text" bind:value={location} maxlength="300" />

    <label for="b-notes">Notities</label>
    <textarea id="b-notes" rows="3" bind:value={notes}></textarea>

    {#if existing?.teachers?.length}
      <p class="small-info">Lesgevers: {existing.teachers.join(', ')}</p>
    {/if}

    <label class="check"><input type="checkbox" bind:checked={repeatWeekly} /> Wekelijks herhalen (tot en met {formatLong(end)})</label>
    {#if existing?.repeatWeekly}<p class="hint">Wijzigingen gelden voor alle herhalingen van dit blok.</p>{/if}

    {#if error}<p class="err" role="alert" data-testid="block-error">{error}</p>{/if}
  </div>

  {#snippet footer()}
    {#if existing}<button type="button" class="danger" onclick={remove}>Verwijderen</button>{/if}
    <span class="spacer"></span>
    <button type="button" onclick={() => ui.close()}>Annuleren</button>
    <button type="button" class="primary" onclick={save}>Opslaan</button>
  {/snippet}
</Modal>
