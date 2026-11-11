<script lang="ts">
  import Modal from './Modal.svelte';
  import ChecklistView from './ChecklistView.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { toggleCheck } from '../lib/planner/ops';
  import { checklistProgress } from '../lib/planner/occurrences';
  import { formatShort, type DateKey } from '../lib/time/dates';
  import { hm } from '../lib/time/quarter';

  let { blockId, date }: { blockId: string; date: DateKey } = $props();
  const block = $derived(store.data.blocks.find(b => b.id === blockId));
  const checked = $derived(new Set(block?.checks?.[date] ?? []));
  const progress = $derived(block ? checklistProgress(block, date) : { done: 0, total: 0 });
</script>

{#if block}
  <Modal title={block.title} onclose={() => ui.close()} testid="checklist-dialog">
    <p class="hint">{formatShort(date)} · {hm(block.start)}–{hm(block.end)} · <strong data-testid="checklist-progress">{progress.done}/{progress.total} klaar</strong></p>
    <ChecklistView items={block.checklist ?? []} {checked} idPrefix="cl" onToggle={id => store.change(d => toggleCheck(d, block.id, date, id))} />
    {#snippet footer()}
      <button type="button" onclick={() => ui.open({ kind: 'block', blockId: block.id, occurrenceDate: date })}>Blok bewerken</button>
      <span class="spacer"></span>
      <button type="button" class="primary" onclick={() => ui.close()}>Sluiten</button>
    {/snippet}
  </Modal>
{/if}
