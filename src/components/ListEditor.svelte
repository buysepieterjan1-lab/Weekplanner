<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from './Modal.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { saveList, deleteList, parseListItems, listItemsToText } from '../lib/planner/ops';
  import { validateList } from '../lib/validate';
  import { formatDuration } from '../lib/time/quarter';

  let { listId }: { listId: string | null } = $props();
  const id = untrack(() => listId);
  const existing = store.data.lists.find(l => l.id === id) ?? null;

  let name = $state(existing?.name ?? '');
  let minutes = $state(existing?.minutes ?? 30);
  let categoryId = $state(existing?.categoryId ?? 'studeren');
  let itemsText = $state(existing ? listItemsToText(existing.items) : '');
  let error = $state('');

  const durations = [5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];
  const options = $derived([...new Set([...durations, minutes])].sort((a, b) => a - b));

  function save() {
    error = validateList(name, store.data.lists.filter(l => l.id !== id).map(l => l.name)) ?? '';
    if (error) return;
    store.change(d => { saveList(d, id, { name, minutes, categoryId, items: parseListItems(itemsText) }); });
    ui.close();
  }

  async function remove() {
    if (!existing) return;
    if (!(await ui.confirm(`Lijst "${existing.name}" verwijderen? Blokken die je er al mee maakte, blijven staan.`))) return;
    store.change(d => deleteList(d, existing.id));
    ui.close();
  }
</script>

<Modal title={existing ? 'Lijst bewerken' : 'Nieuwe lijst'} onclose={() => ui.close()} testid="list-editor">
  <label for="l-name">Naam</label>
  <!-- svelte-ignore a11y_autofocus -->
  <input id="l-name" type="text" bind:value={name} maxlength="60" autofocus placeholder="bv. Half uur Economie A"
    onkeydown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />

  <div class="row2">
    <div>
      <label for="l-min">Duur</label>
      <select id="l-min" bind:value={minutes}>
        {#each options as m}<option value={m}>{formatDuration(m)}</option>{/each}
      </select>
    </div>
    <div>
      <label for="l-cat">Categorie</label>
      <select id="l-cat" bind:value={categoryId}>
        {#each store.data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </div>
  </div>

  <label for="l-items">Checklist (optioneel, één item per regel)</label>
  <textarea id="l-items" rows="6" bind:value={itemsText} placeholder={'Samenvatting hoofdstuk 3\nOefeningen 1–5\nBoekentas: Laptop'}></textarea>
  <p class="hint">Begin een regel met "Groep: " om items te groeperen, bv. "Boekentas: Laptop".</p>

  {#if error}<p class="err" role="alert">{error}</p>{/if}

  {#snippet footer()}
    {#if existing}<button type="button" class="danger" onclick={remove}>Verwijderen</button>{/if}
    <span class="spacer"></span>
    <button type="button" onclick={() => ui.close()}>Annuleren</button>
    <button type="button" class="primary" onclick={save}>Opslaan</button>
  {/snippet}
</Modal>
