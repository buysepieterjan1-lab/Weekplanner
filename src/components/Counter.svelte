<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { periodKeys } from '../lib/time/dates';
  import { countByCategory } from '../lib/planner/counter';
  import { formatDuration } from '../lib/time/quarter';

  const rows = $derived(countByCategory(
    store.data.blocks, store.data.categories, periodKeys(ui.view, ui.current),
    store.data.settings.endDate, store.data.settings.counterSort,
  ));
  const max = $derived(Math.max(1, ...rows.map(r => r.count)));
  const period = $derived(ui.view === 'day' ? 'dag' : ui.view === 'week' ? 'week' : 'maand');

  function setSort(s: 'count' | 'name') {
    store.change(d => { d.settings.counterSort = s; });
  }
</script>

<section class="panel" aria-labelledby="counter-h">
  <h2 id="counter-h">Teller <small>deze {period}</small></h2>
  <div class="seg small" role="group" aria-label="Sorteren">
    <button type="button" aria-pressed={store.data.settings.counterSort === 'count'} class:active={store.data.settings.counterSort === 'count'} onclick={() => setSort('count')}>Aantal</button>
    <button type="button" aria-pressed={store.data.settings.counterSort === 'name'} class:active={store.data.settings.counterSort === 'name'} onclick={() => setSort('name')}>Naam</button>
  </div>
  <ul class="counter" data-testid="counter">
    {#each rows as r (r.category.id)}
      <li style:--c={r.category.color} class:zero={!r.count}>
        <div class="c-top">
          <span class="c-name">{r.category.name}</span>
          <span class="c-num">{r.count} {r.count === 1 ? 'blok' : 'blokken'} · {formatDuration(r.minutes)}</span>
        </div>
        <div class="c-bar" aria-hidden="true"><i style:width="{(r.count / max) * 100}%"></i></div>
      </li>
    {/each}
  </ul>
</section>
