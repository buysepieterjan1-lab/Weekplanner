<script lang="ts">
  import { store } from '../lib/store/state.svelte';
  import { ui } from '../lib/store/ui.svelte';
  import { occurrencesOn } from '../lib/planner/occurrences';
  import { layoutDay } from '../lib/planner/layout';
  import { drag, PX_PER_MIN } from '../actions/dnd.svelte';
  import { startGesture } from '../actions/gesture';
  import { snapRange, placeBlock, hm, clamp, DAY_MINUTES } from '../lib/time/quarter';
  import { DAYS_LONG, weekday, formatLong, type DateKey } from '../lib/time/dates';
  import { DEFAULT_DURATION } from '../lib/model/defaults';
  import BlockView from './BlockView.svelte';

  let { day, isToday, nowMin }: { day: DateKey; isToday: boolean; nowMin: number } = $props();

  const end = $derived(store.data.settings.endDate);
  const disabled = $derived(day > end);
  const placed = $derived(
    layoutDay(occurrencesOn(store.data.blocks, day, end).map(o => ({ occ: o, start: o.block.start, end: o.block.end }))),
  );
  let col: HTMLDivElement;
  let sel = $state<{ a: number; b: number } | null>(null);
  const selRange = $derived(sel ? snapRange(sel.a, sel.b) : null);

  const dropPreview = $derived.by(() => {
    const a = drag.active;
    if (!a || !a.target || a.target.date !== day || disabled) return null;
    const dur = a.payload.kind === 'block' ? a.payload.duration : a.payload.duration;
    return { ...placeBlock(a.target.start, dur), title: a.payload.title };
  });

  const minAt = (y: number) => clamp((y - col.getBoundingClientRect().top) / PX_PER_MIN, 0, DAY_MINUTES);

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
        else { const p = placeBlock(s.a, DEFAULT_DURATION); create(p.start, p.end); }
      },
      onCancel() { sel = null; },
    });
  }

  function ondblclick(e: MouseEvent) {
    if (disabled || e.target !== col) return;
    const p = placeBlock(minAt(e.clientY), DEFAULT_DURATION);
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
  {#each placed as p (p.item.occ.key)}
    <BlockView occ={p.item.occ} lane={p.lane} lanes={p.lanes} />
  {/each}

  {#if selRange}
    <div class="sel-preview" style:top="{selRange.start * PX_PER_MIN}px" style:height="{(selRange.end - selRange.start) * PX_PER_MIN}px" aria-hidden="true">
      <span>{hm(selRange.start)} – {hm(selRange.end)}</span>
    </div>
  {/if}

  {#if dropPreview}
    <div class="drop-preview" style:top="{dropPreview.start * PX_PER_MIN}px" style:height="{(dropPreview.end - dropPreview.start) * PX_PER_MIN}px" aria-hidden="true">
      <span>{hm(dropPreview.start)} – {hm(dropPreview.end)}</span>
    </div>
  {/if}

  {#if isToday}
    <div class="now-line" style:top="{nowMin * PX_PER_MIN}px" aria-hidden="true"></div>
  {/if}
</div>
