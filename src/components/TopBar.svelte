<script lang="ts">
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { rangeLabel, stepKey, canGoNext, clampToEnd, todayKey, daysUntil, formatLong, type View } from '../lib/time/dates';

  const end = $derived(store.data.settings.endDate);
  const label = $derived(rangeLabel(ui.view, ui.current));
  const nextOk = $derived(canGoNext(ui.view, ui.current, end));
  const days = $derived(daysUntil(todayKey(), store.data.settings.examDate));
  const countdown = $derived(
    days > 1 ? `Eerste examen over ${days} dagen` : days === 1 ? 'Eerste examen morgen' : days === 0 ? 'Eerste examen vandaag' : '',
  );

  const views: { id: View; label: string }[] = [
    { id: 'day', label: 'Dag' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Maand' },
  ];

  function step(n: number) {
    if (n > 0 && !nextOk) return;
    ui.current = clampToEnd(stepKey(ui.view, ui.current, n), end);
  }
  function newBlock() {
    const date = clampToEnd(ui.current, end);
    ui.open({ kind: 'block', blockId: null, draft: { date, start: 9 * 60, end: 10 * 60 } });
  }
</script>

<header class="topbar">
  <div class="brand-row">
    {#if ui.mobile}
      <button type="button" class="icon-btn" onclick={() => (ui.drawerOpen = !ui.drawerOpen)} aria-expanded={ui.drawerOpen} aria-controls="side-drawer">
        <span aria-hidden="true">☰</span><span class="sr-only">Lijsten, taken en teller</span>
      </button>
    {/if}
    <h1 class="brand">Studieplanner</h1>
    {#if countdown}
      <p class="countdown" data-testid="countdown" title="Eerste examendag: {formatLong(store.data.settings.examDate)}">{countdown}</p>
    {/if}
  </div>

  <nav class="nav" aria-label="Periode">
    <button type="button" onclick={() => step(-1)} aria-label="Vorige periode">‹</button>
    <button type="button" onclick={() => (ui.current = clampToEnd(todayKey(), end))}>Vandaag</button>
    <button type="button" onclick={() => step(1)} disabled={!nextOk} aria-label="Volgende periode"
      title={nextOk ? undefined : `De planner loopt tot en met ${formatLong(end)}`}>›</button>
    <h2 class="range" aria-live="polite" data-testid="range">{label}</h2>
  </nav>

  <div class="actions">
    <div class="seg" role="group" aria-label="Weergave">
      {#each views as v}
        <button type="button" aria-pressed={ui.view === v.id} class:active={ui.view === v.id} onclick={() => (ui.view = v.id)}>{v.label}</button>
      {/each}
    </div>
    <button type="button" class="primary" onclick={newBlock}>+ Blok</button>
    <button type="button" onclick={() => ui.open({ kind: 'settings' })}>Instellingen</button>
  </div>
</header>
