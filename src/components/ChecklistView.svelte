<script lang="ts">
  /** Toont een checklist, gegroepeerd (Boekentas, Voorzakje, …). */
  let { items, checked, onToggle, idPrefix }: {
    items: { id: string; text: string; minutes?: number; group?: string }[];
    checked?: Set<string>;
    onToggle?: (id: string) => void;
    idPrefix: string;
  } = $props();

  const groups = $derived.by(() => {
    const out: { name: string; items: typeof items }[] = [];
    for (const it of items) {
      const name = it.group ?? '';
      let g = out.find(x => x.name === name);
      if (!g) { g = { name, items: [] }; out.push(g); }
      g.items.push(it);
    }
    return out;
  });
</script>

{#each groups as g (g.name)}
  {#if g.name}<h3 class="cl-group">{g.name}</h3>{/if}
  <ul class="checklist">
    {#each g.items as it (it.id)}
      <li class:done={checked?.has(it.id)}>
        {#if onToggle}
          <input type="checkbox" id="{idPrefix}-{it.id}" checked={checked?.has(it.id)} onchange={() => onToggle(it.id)} />
          <label for="{idPrefix}-{it.id}">{it.text}</label>
        {:else}
          <span class="bullet" aria-hidden="true">•</span><span>{it.text}</span>
        {/if}
        {#if it.minutes}<small class="cl-min">{it.minutes} min</small>{/if}
      </li>
    {/each}
  </ul>
{/each}
