<script lang="ts">
  import type { Occurrence } from '../lib/planner/occurrences';
  import { checklistProgress } from '../lib/planner/occurrences';
  import { categoryOf, resize, handleDrop } from '../lib/actions';
  import { beginDrag, PX_PER_MIN } from '../actions/dnd.svelte';
  import { startGesture } from '../actions/gesture';
  import { hm, snap, clamp, QUARTER, DAY_MINUTES, formatDuration } from '../lib/time/quarter';
  import { shortLocation } from '../lib/ics/timeedit';
  import { addDays, formatShort } from '../lib/time/dates';
  import { ui } from '../lib/store/ui.svelte';
  import { store } from '../lib/store/state.svelte';
  import { resizeBlock, moveBlock } from '../lib/planner/ops';
  import { tick } from 'svelte';

  let { occ, lane, lanes }: { occ: Occurrence; lane: number; lanes: number } = $props();

  const b = $derived(occ.block);
  const cat = $derived(categoryOf(b.categoryId));
  let previewEnd = $state<number | null>(null);
  const end = $derived(previewEnd ?? b.end);
  const height = $derived((end - b.start) * PX_PER_MIN);
  const progress = $derived(b.checklist?.length ? checklistProgress(b, occ.date) : null);
  const room = $derived(shortLocation(b.location));
  const compact = $derived(end - b.start < 45);
  let el: HTMLDivElement;

  function open() {
    if (b.checklist?.length) ui.open({ kind: 'checklist', blockId: b.id, date: occ.date });
    else ui.open({ kind: 'block', blockId: b.id, occurrenceDate: occ.date });
  }

  function onpointerdown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-resize]')) return;
    const r = el.getBoundingClientRect();
    beginDrag(e, {
      kind: 'block', blockId: b.id, fromDate: occ.date, duration: b.end - b.start,
      offset: (e.clientY - r.top) / PX_PER_MIN, title: b.title,
    }, handleDrop, open);
  }

  function onResizeDown(e: PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const top = el.getBoundingClientRect().top;
    startGesture(e, {
      onMove(_x, y) {
        previewEnd = clamp(snap(b.start + (y - top) / PX_PER_MIN), b.start + QUARTER, DAY_MINUTES);
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
    let toDate = occ.date;
    const dur = b.end - b.start;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? -QUARTER : QUARTER;
      if (e.shiftKey) store.change(d => resizeBlock(d, b.id, b.end + delta));
      else store.change(d => moveBlock(d, b.id, occ.date, occ.date, clamp(b.start + delta, 0, DAY_MINUTES - dur)));
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
    `${b.title}, ${formatShort(occ.date)} ${hm(b.start)} tot ${hm(b.end)}` +
    `${room ? `, ${room}` : ''}, ${cat.name}` +
    `${progress ? `, ${progress.done} van ${progress.total} klaar` : ''}` +
    `${b.repeatWeekly ? ', herhaalt wekelijks' : ''}`,
  );
</script>

<div
  bind:this={el}
  class="block"
  class:compact
  class:repeat={b.repeatWeekly}
  class:resizing={previewEnd != null}
  role="button"
  tabindex="0"
  aria-label={label}
  aria-keyshortcuts="Enter ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown"
  title="{b.title} · {hm(b.start)}–{hm(end)} ({formatDuration(end - b.start)})"
  data-occ={occ.key}
  data-testid="block"
  style:top="{b.start * PX_PER_MIN}px"
  style:height="{Math.max(height - 2, 14)}px"
  style:left="calc({(lane * 100) / lanes}% + 2px)"
  style:width="calc({100 / lanes}% - 4px)"
  style:--c={cat.color}
  {onpointerdown}
  {onkeydown}
>
  <div class="b-head">
    <span class="b-start">{hm(b.start)}</span>
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
  <span class="b-end">{hm(end)}</span>
  <div class="b-resize" data-resize aria-hidden="true" onpointerdown={onResizeDown}></div>
</div>
