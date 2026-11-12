<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store/state.svelte';
  import { ui } from './lib/store/ui.svelte';
  import { clampToEnd } from './lib/time/dates';
  import TopBar from './components/TopBar.svelte';
  import Grid from './components/Grid.svelte';
  import MonthView from './components/MonthView.svelte';
  import Lists from './components/Lists.svelte';
  import Todos from './components/Todos.svelte';
  import Counter from './components/Counter.svelte';
  import Afvinklijst from './components/Afvinklijst.svelte';
  import ListEditor from './components/ListEditor.svelte';
  import BlockDialog from './components/BlockDialog.svelte';
  import ChecklistDialog from './components/ChecklistDialog.svelte';
  import ListDialog from './components/ListDialog.svelte';
  import PlanTodoDialog from './components/PlanTodoDialog.svelte';
  import SettingsDialog from './components/SettingsDialog.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import Decor from './components/Decor.svelte';

  const MOBILE = '(max-width: 760px)';
  const NARROW = '(max-width: 1180px)';
  let narrow = $state(false);

  onMount(() => {
    const mq = window.matchMedia(MOBILE);
    const nq = window.matchMedia(NARROW);
    ui.mobile = mq.matches;
    narrow = nq.matches;
    if (ui.mobile) ui.view = 'day';
    const onChange = () => { ui.mobile = mq.matches; narrow = nq.matches; if (!ui.mobile) ui.drawerOpen = false; };
    mq.addEventListener('change', onChange);
    nq.addEventListener('change', onChange);
    void store.init().then(() => { ui.current = clampToEnd(ui.current, store.data.settings.endDate); });
    return () => { mq.removeEventListener('change', onChange); nq.removeEventListener('change', onChange); };
  });

  const d = $derived(ui.dialog);
</script>

{#if store.data.settings.decor}<Decor />{/if}

<div class="app" class:mobile={ui.mobile} data-ready={store.ready}>
  <TopBar />

  <main class="layout" class:view-month={ui.view === 'month'}>
    {#if ui.mobile && ui.drawerOpen && !ui.drawerPeek}
      <button type="button" class="scrim" aria-label="Lade sluiten" onclick={() => (ui.drawerOpen = false)}></button>
    {/if}
    <aside
      id="side-drawer"
      class="side"
      class:open={ui.drawerOpen}
      class:peek={ui.drawerPeek}
      aria-label="Lijsten, taken en teller"
      inert={ui.mobile && !ui.drawerOpen ? true : undefined}
    >
      {#if ui.mobile}
        <button type="button" class="drawer-close" onclick={() => (ui.drawerOpen = false)}>Sluiten</button>
      {/if}
      <Lists />
      <Todos />
      {#if ui.mobile || narrow}<Afvinklijst /><Counter />{/if}
    </aside>

    <section class="planner" aria-label="Planner">
      {#if ui.view === 'month'}<MonthView />{:else}<Grid />{/if}
    </section>

    {#if !ui.mobile && !narrow}
      <aside class="side right" aria-label="Teller en afvinklijst"><Counter /><Afvinklijst /></aside>
    {/if}
  </main>
</div>

{#if d.kind === 'block'}
  {#key d}<BlockDialog blockId={d.blockId} occurrenceDate={d.occurrenceDate} draft={d.draft} />{/key}
{:else if d.kind === 'checklist'}
  <ChecklistDialog blockId={d.blockId} date={d.date} />
{:else if d.kind === 'list'}
  <ListDialog template={d.template} />
{:else if d.kind === 'listEdit'}
  <ListEditor listId={d.listId} />
{:else if d.kind === 'plan'}
  <PlanTodoDialog todoId={d.todoId} />
{:else if d.kind === 'settings'}
  <SettingsDialog />
{/if}

{#if ui.confirmState}<ConfirmDialog />{/if}

<div class="toasts" role="status" aria-live="polite">
  {#each ui.toasts as t (t.id)}<p class="toast" class:error={t.tone === 'error'}>{t.text}</p>{/each}
</div>
