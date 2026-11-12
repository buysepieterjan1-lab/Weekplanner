<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from './Modal.svelte';
  import MiniCalendar from './MiniCalendar.svelte';
  import { store } from '../lib/store/state.svelte';
  import { ui, type BlockDraft } from '../lib/store/ui.svelte';
  import { validateBlock, validateRepeat } from '../lib/validate';
  import { addBlock, updateBlock, deleteBlock, type BlockFields } from '../lib/planner/ops';
  import { isRepeating } from '../lib/planner/occurrences';
  import TimeInput from './TimeInput.svelte';
  import { hm, resolveEnd, formatDuration } from '../lib/time/quarter';
  import { formatLong, weekday, DAYS_SHORT, DAYS_LONG, isDateKey, type DateKey } from '../lib/time/dates';
  import type { Repeat, RepeatKind } from '../lib/model/types';

  let { blockId, occurrenceDate, draft }: { blockId: string | null; occurrenceDate?: DateKey; draft?: BlockDraft } = $props();

  // De dialoog werkt met een kopie van de beginwaarden.
  const init = untrack(() => ({ blockId, occurrenceDate, draft }));
  const existing = store.data.blocks.find(b => b.id === init.blockId) ?? null;
  const end = store.data.settings.endDate;
  const r0: Repeat = existing?.repeat ?? { kind: 'none' };

  let title = $state(existing?.title ?? '');
  let date = $state<string>(init.occurrenceDate ?? existing?.date ?? init.draft?.date ?? ui.current);
  let start = $state<number | null>(existing?.start ?? init.draft?.start ?? 540);
  // getypte eindtijd (zonder dag); ligt die vóór het begin, dan is het de volgende dag
  const e0 = existing?.end ?? init.draft?.end ?? 600;
  let stop = $state<number | null>(e0 > 1440 ? e0 - 1440 : e0);
  let categoryId = $state(existing?.categoryId ?? store.data.categories[0]?.id ?? 'overig');
  let location = $state(existing?.location ?? '');
  let notes = $state(existing?.notes ?? '');
  let repeatKind = $state<RepeatKind>(r0.kind);
  let until = $state<string>(r0.until ?? end);
  let days = $state<number[]>(r0.days ?? []);
  let extraDates = $state<DateKey[]>(r0.dates ?? []);
  let todoChoice = $state<boolean | null>(existing ? (typeof existing.inTodo === 'boolean' ? existing.inTodo : null) : null);
  let error = $state('');

  const catDefault = $derived(store.data.categories.find(c => c.id === categoryId)?.inChecklist ?? false);
  const inTodo = $derived(todoChoice ?? catDefault);
  const wd = $derived(isDateKey(date) ? weekday(date) : 0);

  const endAbs = $derived(start != null && stop != null && stop !== start ? resolveEnd(start, stop) : null);
  const timeHint = $derived.by(() => {
    if (endAbs == null || start == null) return '';
    const dur = formatDuration(endAbs - start);
    return endAbs > 1440 ? `Eindigt de volgende dag om ${hm(endAbs)} · ${dur}` : `Duur: ${dur}`;
  });

  function toggleDay(d: number) {
    if (d === wd) return; // de dag van de eerste keer hoort er altijd bij
    days = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort();
  }
  function toggleDate(d: DateKey) {
    extraDates = extraDates.includes(d) ? extraDates.filter(x => x !== d) : [...extraDates, d].sort();
  }

  function buildRepeat(): Repeat {
    const u = until && until < end ? { until } : {};
    switch (repeatKind) {
      case 'none': return { kind: 'none' };
      case 'daily': return { kind: 'daily', ...u };
      case 'weekly': return { kind: 'weekly', ...u };
      case 'weekdays': return { kind: 'weekdays', days: [...new Set([...days, wd])].sort(), ...u };
      case 'dates': return { kind: 'dates', dates: extraDates.filter(d => d > date && d <= end) };
    }
  }

  function save() {
    error = validateBlock({ title, date, start, end: start != null && stop != null && stop !== start ? resolveEnd(start, stop) : stop }, end) ?? '';
    const repeat = buildRepeat();
    if (!error) error = validateRepeat(repeat, date, end) ?? '';
    if (error) return;
    const f: BlockFields = {
      title, date, start: start!, end: endAbs!, categoryId, location: location.trim(), notes: notes.trim(), repeat,
      ...(todoChoice === null || todoChoice === catDefault ? {} : { inTodo: todoChoice }),
    };
    if (existing) store.change(d => updateBlock(d, existing.id, f, init.occurrenceDate));
    else store.change(d => { addBlock(d, f); });
    ui.current = date;
    ui.close();
  }

  async function remove() {
    if (!existing) return;
    const ok = await ui.confirm(isRepeating(existing) ? 'Dit blok en alle herhalingen verwijderen?' : 'Dit blok verwijderen?');
    if (!ok) return;
    store.change(d => deleteBlock(d, existing.id));
    ui.close();
  }

  function enter(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement) return;
    e.preventDefault();
    save();
  }

  const weekdayName = $derived(DAYS_LONG[wd]);
</script>

<Modal title={existing ? 'Blok bewerken' : 'Nieuw blok'} onclose={() => ui.close()} testid="block-dialog">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fields" onkeydown={enter}>
    <label for="b-title">Titel</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="b-title" type="text" bind:value={title} maxlength="120" autofocus aria-invalid={error === 'Vul een titel in.'} />

    <div class="row3">
      <div>
        <label for="b-date">Datum</label>
        <input id="b-date" type="date" bind:value={date} max={end} />
      </div>
      <div>
        <label for="b-start">Start</label>
        <TimeInput id="b-start" bind:value={start} describedby="b-time-hint" />
      </div>
      <div>
        <label for="b-end">Einde</label>
        <TimeInput id="b-end" bind:value={stop} describedby="b-time-hint" />
      </div>
    </div>
    <p class="hint" id="b-time-hint" data-testid="time-hint" aria-live="polite">{timeHint || 'Typ bv. 9:30, 12:01 of 1430.'}</p>

    <label for="b-cat">Categorie</label>
    <select id="b-cat" bind:value={categoryId}>
      {#each store.data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>

    <label for="b-loc">Locatie</label>
    <input id="b-loc" type="text" bind:value={location} maxlength="300" />

    <label for="b-notes">Notities</label>
    <textarea id="b-notes" rows="3" bind:value={notes}></textarea>

    {#if existing?.teachers?.length}
      <p class="small-info">Lesgevers: {existing.teachers.join(', ')}</p>
    {/if}

    <label class="check">
      <input type="checkbox" checked={inTodo} onchange={e => (todoChoice = (e.currentTarget as HTMLInputElement).checked)} />
      In de afvinklijst zetten
    </label>

    <fieldset class="repeat">
      <legend>Herhalen</legend>
      <label for="b-repeat" class="sr-only">Herhalen</label>
      <select id="b-repeat" bind:value={repeatKind}>
        <option value="none">Niet herhalen</option>
        <option value="daily">Elke dag</option>
        <option value="weekly">Elke week op {weekdayName}</option>
        <option value="weekdays">Op gekozen weekdagen</option>
        <option value="dates">Zelf aanduiden in een kalender</option>
      </select>

      {#if repeatKind === 'weekdays'}
        <div class="weekday-picker" role="group" aria-label="Weekdagen">
          {#each DAYS_SHORT as d, i}
            <button type="button" class:on={i === wd || days.includes(i)} aria-pressed={i === wd || days.includes(i)}
              disabled={i === wd} aria-label={DAYS_LONG[i]} onclick={() => toggleDay(i)}>{d}</button>
          {/each}
        </div>
      {/if}

      {#if repeatKind === 'daily' || repeatKind === 'weekly' || repeatKind === 'weekdays'}
        <label for="b-until">Tot en met</label>
        <input id="b-until" type="date" bind:value={until} min={date} max={end} />
      {/if}

      {#if repeatKind === 'dates' && isDateKey(date)}
        <MiniCalendar first={date} selected={extraDates.filter(d => d > date)} min={date} max={end} ontoggle={toggleDate} />
      {/if}

      {#if existing && isRepeating(existing)}<p class="hint">Wijzigingen gelden voor alle herhalingen van dit blok.</p>{/if}
      {#if repeatKind !== 'none'}<p class="hint">Herhalingen lopen nooit verder dan {formatLong(end)}.</p>{/if}
    </fieldset>

    {#if error}<p class="err" role="alert" data-testid="block-error">{error}</p>{/if}
  </div>

  {#snippet footer()}
    {#if existing}<button type="button" class="danger" onclick={remove}>Verwijderen</button>{/if}
    <span class="spacer"></span>
    <button type="button" onclick={() => ui.close()}>Annuleren</button>
    <button type="button" class="primary" onclick={save}>Opslaan</button>
  {/snippet}
</Modal>
