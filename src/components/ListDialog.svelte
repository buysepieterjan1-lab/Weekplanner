<script lang="ts">
  import Modal from './Modal.svelte';
  import ChecklistView from './ChecklistView.svelte';
  import PlanFields from './PlanFields.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { planTemplate } from '../lib/actions';
  import type { ListTemplate } from '../lib/model/types';

  let { template }: { template: ListTemplate } = $props();
  const items = $derived(template.items.map((it, i) => ({ id: String(i), ...it })));
  const total = $derived(template.items.reduce((a, i) => a + (i.minutes ?? 0), 0));
</script>

<Modal title={template.name} onclose={() => ui.close()} testid="list-dialog">
  <p class="hint">{template.minutes} min{total ? ` · som van de stappen: ${total} min` : ''}. Sleep de lijst naar de planner om een blok met deze checklist te maken.</p>
  <ChecklistView {items} idPrefix="tpl" />
  <h3 class="cl-group">Of plan in zonder slepen</h3>
  <PlanFields onplan={(d, s) => planTemplate(template.id, d, s)} />
  {#snippet footer()}
    <span class="spacer"></span>
    <button type="button" class="primary" onclick={() => ui.close()}>Sluiten</button>
  {/snippet}
</Modal>
