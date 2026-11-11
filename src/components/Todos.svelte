<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { startOfWeek, isoWeek } from '../lib/time/dates';
  import { addTodo } from '../lib/planner/ops';
  import { beginDrag } from '../actions/dnd.svelte';
  import { handleDrop, categoryOf } from '../lib/actions';

  const week = $derived(startOfWeek(ui.current));
  const items = $derived(store.data.todos.filter(t => t.week === week));
  let text = $state('');
  let cat = $state('studeren');
  let error = $state('');

  function add() {
    if (!text.trim()) { error = 'Typ eerst een taak.'; return; }
    error = '';
    store.change(d => { addTodo(d, week, text, cat); });
    text = '';
  }
  function toggle(id: string) {
    store.change(d => { const t = d.todos.find(x => x.id === id); if (t) t.done = !t.done; });
  }
  async function remove(id: string) {
    store.change(d => { d.todos = d.todos.filter(x => x.id !== id); });
  }
</script>

<section class="panel" aria-labelledby="todo-h">
  <h2 id="todo-h">Todo <small>week {isoWeek(week).week}</small></h2>
  <div class="todo-add">
    <label class="sr-only" for="todo-text">Nieuwe taak</label>
    <input id="todo-text" type="text" placeholder="Nieuwe taak…" maxlength="120" bind:value={text}
      aria-invalid={!!error} aria-describedby={error ? 'todo-err' : undefined}
      onkeydown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
    <div class="row">
      <label class="sr-only" for="todo-cat">Categorie</label>
      <select id="todo-cat" bind:value={cat}>
        {#each store.data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
      <button type="button" class="primary" onclick={add}>Toevoegen</button>
    </div>
    {#if error}<p class="err" id="todo-err" role="alert">{error}</p>{/if}
  </div>

  <ul class="todos" data-testid="todo-list">
    {#each items as t (t.id)}
      <li class="todo" class:done={t.done} style:--c={categoryOf(t.categoryId).color}
        onpointerdown={e => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          beginDrag(e, { kind: 'todo', todoId: t.id, duration: 60, title: t.text }, handleDrop);
        }}>
        <input type="checkbox" id="todo-{t.id}" checked={t.done} onchange={() => toggle(t.id)} />
        <label for="todo-{t.id}" class="todo-text">{t.text}</label>
        <button type="button" class="icon-btn small" onclick={() => ui.open({ kind: 'plan', todoId: t.id })} aria-label="{t.text} inplannen" title="Inplannen">⏱</button>
        <button type="button" class="icon-btn small" onclick={() => remove(t.id)} aria-label="{t.text} verwijderen" title="Verwijderen">×</button>
      </li>
    {:else}
      <li class="empty">Geen taken deze week.</li>
    {/each}
  </ul>
  <p class="hint">Sleep een taak naar een dag om er een blok van 1 uur van te maken.</p>
</section>
