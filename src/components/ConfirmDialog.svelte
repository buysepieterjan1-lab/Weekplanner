<script lang="ts">
  import Modal from './Modal.svelte';
  import { ui } from '../lib/store/ui.svelte';

  const c = $derived(ui.confirmState!);
  function answer(v: boolean) {
    const r = c.resolve;
    ui.confirmState = null;
    r(v);
  }
</script>

<Modal title="Ben je zeker?" onclose={() => answer(false)} testid="confirm-dialog">
  <p>{c.text}</p>
  {#snippet footer()}
    <span class="spacer"></span>
    <button type="button" onclick={() => answer(false)}>Annuleren</button>
    <button type="button" class="primary danger-fill" onclick={() => answer(true)}>{c.ok}</button>
  {/snippet}
</Modal>
