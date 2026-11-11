<script lang="ts">
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { monthGrid, monthIndex, dayNumber, todayKey, DAYS_SHORT, DAYS_LONG, weekday, formatLong, type DateKey } from '../lib/time/dates';
  import { occurrencesOn } from '../lib/planner/occurrences';
  import { categoryOf } from '../lib/actions';

  const cells = $derived(monthGrid(ui.current));
  const month = $derived(monthIndex(ui.current));
  const today = todayKey();
  const end = $derived(store.data.settings.endDate);

  function open(d: DateKey) {
    ui.current = d;
    ui.view = 'day';
  }
</script>

<div class="month" role="grid" aria-label="Maandoverzicht">
  <div class="m-row m-head" role="row">
    {#each DAYS_SHORT as d}<div role="columnheader">{d}</div>{/each}
  </div>
  {#each [0, 1, 2, 3, 4, 5] as w}
    <div class="m-row" role="row">
      {#each cells.slice(w * 7, w * 7 + 7) as d (d)}
        {@const occ = occurrencesOn(store.data.blocks, d, end)}
        <div role="gridcell">
          <button
            type="button"
            class="m-cell"
            class:other={monthIndex(d) !== month}
            class:today={d === today}
            disabled={d > end}
            onclick={() => open(d)}
            aria-label="{DAYS_LONG[weekday(d)]} {formatLong(d)}: {occ.length} {occ.length === 1 ? 'blok' : 'blokken'}"
          >
            <span class="m-num">{dayNumber(d)}</span>
            <span class="m-dots" aria-hidden="true">
              {#each occ.slice(0, 8) as o (o.key)}<i style:background={categoryOf(o.block.categoryId).color}></i>{/each}
            </span>
            {#if occ.length}<span class="m-count">{occ.length} {occ.length === 1 ? 'blok' : 'blokken'}</span>{/if}
          </button>
        </div>
      {/each}
    </div>
  {/each}
</div>
