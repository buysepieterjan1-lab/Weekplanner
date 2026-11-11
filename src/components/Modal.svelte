<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, onclose, children, footer, testid }: {
    title: string;
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
    testid?: string;
  } = $props();

  const id = $props.id();
  let dlg: HTMLDialogElement;

  $effect(() => {
    if (!dlg.open) dlg.showModal();
    return () => { if (dlg.open) dlg.close(); };
  });
</script>

<!-- Geen <form>: in ingesloten vensters wordt formulierverzending geblokkeerd. -->
<dialog
  bind:this={dlg}
  class="modal"
  aria-labelledby="{id}-t"
  data-testid={testid}
  oncancel={e => { e.preventDefault(); onclose(); }}
>
  <div class="m-inner">
    <h2 id="{id}-t" class="m-title">{title}</h2>
    <div class="m-body">{@render children()}</div>
    {#if footer}<div class="m-foot">{@render footer()}</div>{/if}
  </div>
</dialog>
