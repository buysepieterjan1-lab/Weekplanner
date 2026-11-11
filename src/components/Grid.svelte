<script lang="ts">
  import { onMount } from 'svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { weekDays, todayKey, DAYS_SHORT, weekday, dayNumber, MONTHS, monthIndex, DAYS_LONG, formatLong, type DateKey } from '../lib/time/dates';
  import { PX_PER_MIN, drag } from '../actions/dnd.svelte';
  import DayColumn from './DayColumn.svelte';

  const days = $derived<DateKey[]>(ui.view === 'day' ? [ui.current] : weekDays(ui.current));
  let now = $state(new Date());
  const today = $derived(todayKey(now));
  const nowMin = $derived(now.getHours() * 60 + now.getMinutes());
  let scroller: HTMLDivElement;

  onMount(() => {
    scroller.scrollTop = 7 * 60 * PX_PER_MIN - 8;
    const t = setInterval(() => { now = new Date(); }, 60_000);
    return () => clearInterval(t);
  });

  function openDay(d: DateKey) {
    ui.current = d;
    ui.view = 'day';
  }
</script>

<div class="grid-scroll" data-grid-scroll bind:this={scroller} class:dragging={!!drag.active}>
  <div class="grid" style:--cols={days.length} class:single={days.length === 1}>
    <div class="corner" aria-hidden="true"></div>
    {#each days as d (d)}
      <button
        type="button"
        class="day-head"
        class:today={d === today}
        class:past-end={d > store.data.settings.endDate}
        onclick={() => openDay(d)}
        aria-label="Open {DAYS_LONG[weekday(d)]} {formatLong(d)} in dagweergave"
      >
        <span class="dh-day">{DAYS_SHORT[weekday(d)]}</span>
        <span class="dh-date">{dayNumber(d)} {MONTHS[monthIndex(d)].slice(0, 3)}</span>
      </button>
    {/each}

    <div class="hours" aria-hidden="true">
      {#each Array.from({ length: 24 }, (_, i) => i) as h}
        <span style:top="{h * 60 * PX_PER_MIN}px">{String(h).padStart(2, '0')}:00</span>
      {/each}
    </div>

    {#each days as d (d)}
      <DayColumn day={d} isToday={d === today} {nowMin} />
    {/each}
  </div>
</div>

{#if drag.active}
  <div class="drag-ghost" style:left="{drag.active.x + 12}px" style:top="{drag.active.y + 12}px" aria-hidden="true">
    {drag.active.payload.title}
  </div>
{/if}
