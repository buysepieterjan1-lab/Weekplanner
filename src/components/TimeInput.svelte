<script lang="ts">
  /** Tijd vrij typen: 12:01, 12.01, 12u01, 1201, 9 … Bij verlaten wordt het netjes als uu:mm getoond. */
  import { untrack } from 'svelte';
  import { parseTime, hm } from '../lib/time/quarter';

  let { id, value = $bindable(), describedby }: { id: string; value: number | null; describedby?: string } = $props();

  let text = $state(untrack(() => (value == null ? '' : hm(value))));
  let lastSet = untrack(() => value);

  // waarde van buitenaf gewijzigd (bv. ander blok): tekst bijwerken
  $effect(() => {
    if (value !== lastSet) {
      lastSet = value;
      text = value == null ? '' : hm(value);
    }
  });

  function oninput(e: Event) {
    text = (e.currentTarget as HTMLInputElement).value;
    value = parseTime(text);
    lastSet = value;
  }
  function onblur() {
    if (value != null) text = hm(value);
  }
</script>

<input
  {id}
  type="text"
  inputmode="decimal"
  autocomplete="off"
  placeholder="uu:mm"
  maxlength="6"
  value={text}
  aria-invalid={text.trim() !== '' && value == null}
  aria-describedby={describedby}
  {oninput}
  {onblur}
/>
