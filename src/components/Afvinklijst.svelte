<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { periodKeys, formatShort } from '../lib/time/dates';
  import { occurrencesIn, inChecklist, isDone } from '../lib/planner/occurrences';
  import { toggleDone } from '../lib/planner/ops';
  import { categoryOf } from '../lib/actions';
  import { hm } from '../lib/time/quarter';

  const items = $derived(
    occurrencesIn(store.data.blocks, periodKeys(ui.view, ui.current), store.data.settings.endDate)
      .filter(o => inChecklist(o.block, store.data.categories))
      .map(o => ({ ...o, done: isDone(o.block, o.date) })),
  );
  const doneCount = $derived(items.filter(i => i.done).length);
  const pct = $derived(items.length ? Math.round((doneCount / items.length) * 100) : 0);
  const period = $derived(ui.view === 'day' ? 'deze dag' : ui.view === 'week' ? 'deze week' : 'deze maand');

  const cats = $derived(store.data.categories.filter(c => c.inChecklist).map(c => c.name));
  // cirkel
  const R = 22;
  const C = 2 * Math.PI * R;
</script>

<section class="panel" aria-labelledby="afvink-h" data-testid="afvinklijst">
  <h2 id="afvink-h">Afvinklijst <small>{period}</small></h2>
  <div class="ring-row">
    <svg class="ring" viewBox="0 0 56 56" role="img" aria-label="{pct} procent afgewerkt">
      <circle cx="28" cy="28" r={R} class="ring-bg" />
      <circle cx="28" cy="28" r={R} class="ring-fg" stroke-dasharray={C} stroke-dashoffset={C * (1 - pct / 100)} transform="rotate(-90 28 28)" />
      <text x="28" y="32" text-anchor="middle" data-testid="afvink-pct">{pct}%</text>
    </svg>
    <p class="ring-text">
      {#if !items.length}Nog niets te doen.
      {:else if doneCount === items.length}Alles afgewerkt, goed bezig!
      {:else}{doneCount} van {items.length} afgewerkt{/if}
    </p>
  </div>
  <ul class="afvink" data-testid="afvink-list">
    {#each items as it (it.key)}
      <li class:done={it.done} style:--c={categoryOf(it.block.categoryId).color}>
        <input type="checkbox" id="af-{it.key}" checked={it.done}
          onchange={e => { const v = (e.currentTarget as HTMLInputElement).checked; store.change(d => toggleDone(d, it.block.id, it.date, v)); }} />
        <label for="af-{it.key}">
          <span class="af-title">{it.block.title}</span>
          <small>{formatShort(it.date)} · {hm(it.block.start)}</small>
        </label>
      </li>
    {/each}
  </ul>
  <p class="hint">Hier komen ingeplande taken{cats.length ? ` en blokken van ${cats.join(', ')}` : ''}. Per blok aan te passen ("In de afvinklijst zetten"), per categorie in Instellingen.</p>
</section>
