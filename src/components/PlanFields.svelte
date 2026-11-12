<script lang="ts">
  /** Datum + starttijd kiezen: toetsenbordalternatief voor slepen naar de planner. */
  import TimeInput from './TimeInput.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { clampToEnd } from '../lib/time/dates';

  let { onplan, label = 'Inplannen' }: { onplan: (date: string, start: number) => boolean; label?: string } = $props();
  let date = $state(clampToEnd(ui.current, store.data.settings.endDate));
  let start = $state<number | null>(9 * 60);
  let error = $state('');

  function go() {
    if (!date) { error = 'Kies een geldige datum.'; return; }
    if (start == null || start >= 1440) { error = 'Vul een geldige starttijd in (bv. 09:30 of 12:01).'; return; }
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
    <TimeInput id="p-start" bind:value={start} />
  </div>
  <button type="button" class="primary" onclick={go}>{label}</button>
</div>
{#if error}<p class="err" role="alert">{error}</p>{/if}
