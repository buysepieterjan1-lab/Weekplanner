<script lang="ts">
  import type { Segment } from '../lib/planner/occurrences';
  import { checklistProgress, isDone, isRepeating, describeRepeat } from '../lib/planner/occurrences';
  import { categoryOf, resize, handleDrop } from '../lib/actions';
  import { beginDrag, px } from '../actions/dnd.svelte';
  import { startGesture } from '../actions/gesture';
  import { hm, snap, clamp, STEP, DAY_MINUTES, formatDuration } from '../lib/time/quarter';
  import { shortLocation } from '../lib/ics/timeedit';
  import { addDays, diffDays, formatShort } from '../lib/time/dates';
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { resizeBlock, moveBlock, toggleDone } from '../lib/planner/ops';
  import { tick } from 'svelte';

  let { seg, lane, lanes }: { seg: Segment; lane: number; lanes: number } = $props();

  // `seg` is het stuk op deze dag; `occ.date` is de dag waarop het blok begint
  const occ = $derived(seg);
  const b = $derived(seg.block);
  const cat = $derived(categoryOf(b.categoryId));
  let previewEnd = $state<number | null>(null);
  const end = $derived(previewEnd ?? b.end);
  // het stuk op deze dag: eerste dag tot middernacht, of vervolg vanaf 00:00
  const segTop = $derived(seg.segStart);
  const segBottom = $derived(seg.fromPrev ? end - DAY_MINUTES : Math.min(end, DAY_MINUTES));
  const height = $derived((segBottom - segTop) * px());
  const canResize = $derived(!seg.continuesNext);
  const progress = $derived(b.checklist?.length ? checklistProgress(b, occ.date) : null);
  const room = $derived(shortLocation(b.location));
  const compact = $derived(segBottom - segTop < 35);
  const done = $derived(isDone(b, occ.date));
  const repeating = $derived(isRepeating(b));

  function setDone(v: boolean) {
    store.change(d => toggleDone(d, b.id, occ.date, v));
  }
  let el: HTMLDivElement;

  function open() {
    if (b.checklist?.length) ui.open({ kind: 'checklist', blockId: b.id, date: occ.date });
    else ui.open({ kind: 'block', blockId: b.id, occurrenceDate: occ.date });
  }

  function onpointerdown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-resize], [data-check]')) return;
    const r = el.getBoundingClientRect();
    beginDrag(e, {
      kind: 'block', blockId: b.id, fromDate: occ.date, duration: b.end - b.start,
      // afstand tot het echte begin (bij het vervolgstuk: vanaf het begin de vorige dag)
      offset: (e.clientY - r.top) / px() + (seg.fromPrev ? DAY_MINUTES - b.start : 0), title: b.title,
    }, handleDrop, open);
  }

  function onResizeDown(e: PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const top = el.getBoundingClientRect().top;
    startGesture(e, {
      onMove(_x, y) {
        const base = seg.fromPrev ? DAY_MINUTES : b.start;
        const max = seg.fromPrev ? b.start + DAY_MINUTES : DAY_MINUTES;
        previewEnd = clamp(snap(base + (y - top) / px()), b.start + STEP, max);
      },
      onEnd(_x, _y, moved) {
        if (previewEnd != null && previewEnd !== b.end) resize(b.id, previewEnd);
        previewEnd = null;
        if (!moved) open(); // tik op de onderrand = gewoon openen
      },
      onCancel() { previewEnd = null; },
    }, { immediate: true });
  }

  async function onkeydown(e: KeyboardEvent) {
    if (e.target !== el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); return; }
    if (e.key === 'x' || e.key === 'X') { e.preventDefault(); setDone(!done); return; }
    let toDate = occ.date;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? -STEP : STEP;
      const before = b.date;
      if (e.shiftKey) store.change(d => resizeBlock(d, b.id, b.end + delta));
      else store.change(d => moveBlock(d, b.id, occ.date, occ.date, b.start + delta));
      toDate = addDays(occ.date, diffDays(before, b.date)); // kan naar de vorige/volgende dag schuiven
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      toDate = addDays(occ.date, e.key === 'ArrowLeft' ? -1 : 1);
      if (toDate > store.data.settings.endDate) return;
      store.change(d => moveBlock(d, b.id, occ.date, toDate, b.start));
    } else return;
    await tick();
    document.querySelector<HTMLElement>(`[data-occ="${b.id}@${toDate}"]`)?.focus();
  }

  const label = $derived(
    `${b.title}, ${formatShort(occ.date)} ${hm(b.start)} tot ${hm(b.end)}${b.end > DAY_MINUTES ? ' (volgende dag)' : ''}` +
    `${room ? `, ${room}` : ''}, ${cat.name}` +
    `${progress ? `, ${progress.done} van ${progress.total} klaar` : ''}` +
    `${repeating ? `, herhaalt ${describeRepeat(b, store.data.settings.endDate)}` : ''}` +
    `${done ? ', afgewerkt' : ''}`,
  );
</script>

<div
  bind:this={el}
  class="block"
  class:compact
  class:repeat={repeating}
  class:done
  class:cont-next={seg.continuesNext}
  class:from-prev={seg.fromPrev}
  class:resizing={previewEnd != null}
  role="button"
  tabindex="0"
  aria-label={label}
  aria-keyshortcuts="Enter X ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown"
  title="{b.title} · {hm(b.start)}–{hm(end)}{end > DAY_MINUTES ? ' (volgende dag)' : ''} ({formatDuration(end - b.start)})"
  data-occ={seg.key}
  data-testid="block"
  style:top="{segTop * px()}px"
  style:height="{Math.max(height - 2, 14)}px"
  style:left="calc({(lane * 100) / lanes}% + 2px)"
  style:width="calc({100 / lanes}% - 4px)"
  style:--c={cat.color}
  {onpointerdown}
  {onkeydown}
>
  <div class="b-head">
    <span class="b-start" title={seg.fromPrev ? 'Begon de vorige dag' : undefined}>{seg.fromPrev ? '↑ ' : ''}{hm(b.start)}</span>
    <span class="b-title">{b.title}</span>
  </div>
  {#if !compact && (room || progress)}
    <div class="b-meta">
      {#if room}<span class="b-room">{room}</span>{/if}
      {#if progress}<span class="b-progress">{progress.done}/{progress.total} klaar</span>{/if}
    </div>
  {:else if compact && progress}
    <span class="b-progress b-progress-inline">{progress.done}/{progress.total} klaar</span>
  {/if}
  <span class="b-end" title={end > DAY_MINUTES ? 'Eindigt de volgende dag' : undefined}>{hm(end)}{seg.continuesNext ? ' ↓' : ''}</span>
  <input
    type="checkbox"
    class="b-check"
    data-check
    data-testid="block-check"
    checked={done}
    tabindex="-1"
    aria-label="{b.title} afvinken"
    title={done ? 'Afgewerkt (klik om terug open te zetten)' : 'Afvinken'}
    onchange={e => setDone((e.currentTarget as HTMLInputElement).checked)}
  />
  {#if canResize}<div class="b-resize" data-resize aria-hidden="true" onpointerdown={onResizeDown}></div>{/if}
</div>
