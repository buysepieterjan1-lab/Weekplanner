<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { segmentsOn } from '../lib/planner/occurrences';
  import { layoutDay } from '../lib/planner/layout';
  import { drag, px } from '../actions/dnd.svelte';
  import { startGesture } from '../actions/gesture';
  import { snapRange, placeBlock, snap, hm, clamp, DAY_MINUTES } from '../lib/time/quarter';
  import { DAYS_LONG, weekday, formatLong, type DateKey } from '../lib/time/dates';
  import { DEFAULT_DURATION } from '../lib/model/defaults';
  import BlockView from './BlockView.svelte';

  let { day, isToday, nowMin }: { day: DateKey; isToday: boolean; nowMin: number } = $props();

  const end = $derived(store.data.settings.endDate);
  const disabled = $derived(day > end);
  const placed = $derived(
    layoutDay(segmentsOn(store.data.blocks, day, end).map(seg => ({ seg, start: seg.segStart, end: seg.segEnd }))),
  );
  let col: HTMLDivElement;
  let sel = $state<{ a: number; b: number } | null>(null);
  const selRange = $derived(sel ? snapRange(sel.a, sel.b) : null);

  const dropPreview = $derived.by(() => {
    const a = drag.active;
    if (!a || !a.target || a.target.date !== day || disabled) return null;
    // zichtbaar deel van het blok op deze dag (het kan over middernacht lopen)
    const st = snap(a.target.start);
    const from = Math.max(st, 0), to = Math.min(st + a.payload.duration, DAY_MINUTES);
    if (to <= from) return null;
    return { start: from, end: to, realStart: st, realEnd: st + a.payload.duration, title: a.payload.title };
  });

  const minAt = (y: number) => clamp((y - col.getBoundingClientRect().top) / px(), 0, DAY_MINUTES);

  function create(start: number, endMin: number) {
    ui.open({ kind: 'block', blockId: null, draft: { date: day, start, end: endMin } });
  }

  function onpointerdown(e: PointerEvent) {
    if (disabled || e.target !== col) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // geen tekstselectie tijdens slepen
    startGesture(e, {
      onStart(_x, y) { const m = minAt(y); sel = { a: m, b: m }; },
      onMove(_x, y) { if (sel) sel.b = minAt(y); },
      onEnd(_x, y, moved) {
        const s = sel;
        sel = null;
        if (!s) return;
        if (moved) { const r = snapRange(s.a, minAt(y)); create(r.start, r.end); }
        else { const p = placeBlock(Math.min(s.a, DAY_MINUTES - 10), DEFAULT_DURATION); create(p.start, p.end); }
      },
      onCancel() { sel = null; },
    });
  }

  function ondblclick(e: MouseEvent) {
    if (disabled || e.target !== col) return;
    const p = placeBlock(Math.min(minAt(e.clientY), DAY_MINUTES - 10), DEFAULT_DURATION);
    create(p.start, p.end);
  }
</script>

<div
  bind:this={col}
  class="day-col"
  class:today={isToday}
  class:disabled
  data-day={disabled ? undefined : day}
  data-testid="day-{day}"
  role="group"
  aria-label="{DAYS_LONG[weekday(day)]} {formatLong(day)}{disabled ? ' (buiten de planner)' : ''}"
  {onpointerdown}
  {ondblclick}
  oncontextmenu={e => e.preventDefault()}
>
  {#each placed as p (p.item.seg.key)}
    <BlockView seg={p.item.seg} lane={p.lane} lanes={p.lanes} />
  {/each}

  {#if selRange}
    <div class="sel-preview" style:top="{selRange.start * px()}px" style:height="{(selRange.end - selRange.start) * px()}px" aria-hidden="true">
      <span>{hm(selRange.start)} – {hm(selRange.end)}</span>
    </div>
  {/if}

  {#if dropPreview}
    <div class="drop-preview" style:top="{dropPreview.start * px()}px" style:height="{(dropPreview.end - dropPreview.start) * px()}px" aria-hidden="true">
      <span>{hm(((dropPreview.realStart % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES)} – {hm(((dropPreview.realEnd % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES || DAY_MINUTES)}</span>
    </div>
  {/if}

  {#if isToday}
    <div class="now-line" style:top="{nowMin * px()}px" aria-hidden="true"></div>
  {/if}
</div>
