<script lang="ts">
  /** Datum + starttijd kiezen: toetsenbordalternatief voor slepen naar de planner. */
  import { QUARTER_OPTIONS } from '../lib/actions';
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { clampToEnd } from '../lib/time/dates';

  let { onplan, label = 'Inplannen' }: { onplan: (date: string, start: number) => boolean; label?: string } = $props();
  let date = $state(clampToEnd(ui.current, store.data.settings.endDate));
  let start = $state(9 * 60);
  let error = $state('');

  function go() {
    if (!date) { error = 'Kies een geldige datum.'; return; }
    error = '';
    if (onplan(date, start)) ui.close();
  }
</script>

<div class="plan-fields">
  <div>
    <label for="p-date">Datum</label>
    <input id="p-date" type="date" bind:value={date} max={store.data.settings.endDate} />
  </div>
  <div>
    <label for="p-start">Start</label>
    <select id="p-start" bind:value={start}>
      {#each QUARTER_OPTIONS.filter(o => o.value < 1440) as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
    </select>
  </div>
  <button type="button" class="primary" onclick={go}>{label}</button>
</div>
{#if error}<p class="err" role="alert">{error}</p>{/if}
