<script lang="ts">
  import { LIST_TEMPLATES } from '../lib/model/defaults';
  import { ui } from '../lib/store/ui.svelte';
  import { beginDrag } from '../actions/dnd.svelte';
  import { handleDrop, categoryOf } from '../lib/actions';
</script>

<section class="panel" aria-labelledby="lists-h">
  <h2 id="lists-h">Lijsten</h2>
  <ul class="chips">
    {#each LIST_TEMPLATES as t (t.id)}
      <li>
        <div
          class="chip"
          role="button"
          tabindex="0"
          data-testid="template-{t.id}"
          style:--c={categoryOf(t.categoryId).color}
          aria-label="{t.name}, {t.minutes} minuten. Enter toont de inhoud."
          onpointerdown={e => beginDrag(e, { kind: 'template', templateId: t.id, duration: t.minutes, title: t.name }, handleDrop,
            () => ui.open({ kind: 'list', template: t }))}
          onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.open({ kind: 'list', template: t }); } }}
        >
          <span>{t.name}</span><small>{t.minutes} min</small>
        </div>
      </li>
    {/each}
  </ul>
  <p class="hint">Klik om de inhoud te zien. Sleep naar de planner om een blok te maken{ui.mobile ? ' (lang indrukken)' : ''}.</p>
</section>
