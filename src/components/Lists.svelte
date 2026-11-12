<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { beginDrag } from '../actions/dnd.svelte';
  import { handleDrop, categoryOf } from '../lib/actions';
  import { formatDuration } from '../lib/time/quarter';
</script>

<section class="panel" aria-labelledby="lists-h">
  <h2 id="lists-h">Lijsten</h2>
  <ul class="chips">
    {#each store.data.lists as t (t.id)}
      <li class="chip-row">
        <div
          class="chip"
          role="button"
          tabindex="0"
          data-testid="template-{t.id}"
          style:--c={categoryOf(t.categoryId).color}
          aria-label="{t.name}, {formatDuration(t.minutes)}. Enter toont de inhoud."
          onpointerdown={e => beginDrag(e, { kind: 'template', templateId: t.id, duration: t.minutes, title: t.name }, handleDrop,
            () => ui.open({ kind: 'list', template: t }))}
          onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.open({ kind: 'list', template: t }); } }}
        >
          <span>{t.name}</span><small>{formatDuration(t.minutes)}</small>
        </div>
        <button type="button" class="icon-btn small" aria-label="Lijst {t.name} bewerken" title="Bewerken"
          onclick={() => ui.open({ kind: 'listEdit', listId: t.id })}>✎</button>
      </li>
    {:else}
      <li class="empty">Nog geen lijsten.</li>
    {/each}
  </ul>
  <button type="button" class="add-list" onclick={() => ui.open({ kind: 'listEdit', listId: null })}>+ Nieuwe lijst</button>
  <p class="hint">Klik om de inhoud te zien. Sleep naar de planner om een blok te maken{ui.mobile ? ' (lang indrukken)' : ''}.</p>
</section>
