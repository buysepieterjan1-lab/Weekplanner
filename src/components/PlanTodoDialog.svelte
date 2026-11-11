<script lang="ts">
  import Modal from './Modal.svelte';
  import PlanFields from './PlanFields.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { planTodo } from '../lib/actions';

  let { todoId }: { todoId: string } = $props();
  const todo = $derived(store.data.todos.find(t => t.id === todoId));
</script>

{#if todo}
  <Modal title="Taak inplannen" onclose={() => ui.close()}>
    <p>{todo.text} <span class="hint">· blok van 1 uur</span></p>
    <PlanFields onplan={(d, s) => planTodo(todo.id, d, s)} />
    {#snippet footer()}
      <span class="spacer"></span>
      <button type="button" onclick={() => ui.close()}>Annuleren</button>
    {/snippet}
  </Modal>
{/if}
