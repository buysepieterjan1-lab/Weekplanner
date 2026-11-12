<script lang="ts">
  import { untrack } from 'svelte';
  /** Kleine maandkalender om zelf dagen aan te duiden. */
  import {
    monthGrid, monthIndex, dayNumber, addMonths, startOfMonth, DAYS_SHORT, DAYS_LONG, weekday, formatLong, MONTHS, yearOf,
    type DateKey,
  } from '../lib/time/dates';

  let { first, selected, min, max, ontoggle }: {
    /** de eerste keer: altijd aangeduid, niet uit te zetten */
    first: DateKey;
    selected: DateKey[];
    min: DateKey;
    max: DateKey;
    ontoggle: (d: DateKey) => void;
  } = $props();

  let month = $state(untrack(() => startOfMonth(first)));
  const cells = $derived(monthGrid(month));
  const set = $derived(new Set(selected));
  const label = $derived(`${MONTHS[monthIndex(month)][0].toUpperCase()}${MONTHS[monthIndex(month)].slice(1)} ${yearOf(month)}`);
</script>

<div class="mini-cal" data-testid="mini-calendar">
  <div class="mc-nav">
    <button type="button" class="icon-btn" aria-label="Vorige maand" disabled={addMonths(month, -1) < startOfMonth(min) && month <= startOfMonth(min)}
      onclick={() => (month = addMonths(month, -1))}>‹</button>
    <strong aria-live="polite">{label}</strong>
    <button type="button" class="icon-btn" aria-label="Volgende maand" disabled={addMonths(month, 1) > max}
      onclick={() => (month = addMonths(month, 1))}>›</button>
  </div>
  <div class="mc-grid" role="group" aria-label="Dagen aanduiden">
    {#each DAYS_SHORT as d}<span class="mc-head" aria-hidden="true">{d}</span>{/each}
    {#each cells as d (d)}
      {@const isFirst = d === first}
      {@const on = isFirst || set.has(d)}
      <button
        type="button"
        class="mc-day"
        class:other={monthIndex(d) !== monthIndex(month)}
        class:on
        class:first={isFirst}
        aria-pressed={on}
        aria-label="{DAYS_LONG[weekday(d)]} {formatLong(d)}{isFirst ? ' (eerste keer)' : ''}"
        disabled={isFirst || d < min || d > max}
        onclick={() => ontoggle(d)}
      >{dayNumber(d)}</button>
    {/each}
  </div>
  <p class="hint">{selected.length + 1} {selected.length === 0 ? 'dag' : 'dagen'} aangeduid (de eerste keer inbegrepen).</p>
</div>
