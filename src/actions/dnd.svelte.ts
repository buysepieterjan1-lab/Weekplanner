/** Slepen van blokken, lijsten en taken naar de planner (werkt met muis én vinger). */
import type { DateKey } from '../lib/time/dates';
import { startGesture } from './gesture';
import { ui } from '../lib/store/ui.svelte';
import { store } from '../lib/store/state.svelte';

/** Pixels per minuut (zoomniveau). */
export function px(): number {
  return store.data.settings.zoom;
}

export type DragPayload =
  | { kind: 'block'; blockId: string; fromDate: DateKey; duration: number; offset: number; title: string }
  | { kind: 'template'; templateId: string; duration: number; title: string }
  | { kind: 'todo'; todoId: string; duration: number; title: string };

export interface DropTarget { date: DateKey; start: number }

interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
  target: DropTarget | null;
  /** start-positie; automatisch scrollen pas na echte beweging */
  x0: number;
  y0: number;
  moved: boolean;
}

export const drag = $state<{ active: DragState | null }>({ active: null });

/** Zoek de dagkolom onder de vinger/muis en reken de starttijd uit. */
export function hitTest(x: number, y: number, offset = 0): DropTarget | null {
  const els = document.elementsFromPoint(x, y);
  const col = els.find(el => el instanceof HTMLElement && el.dataset.day) as HTMLElement | undefined;
  if (!col) return null;
  const r = col.getBoundingClientRect();
  return { date: col.dataset.day!, start: (y - r.top) / px() - offset };
}

let scrollRaf = 0;
let edgeSince = 0;
function autoScroll() {
  cancelAnimationFrame(scrollRaf);
  const a = drag.active;
  if (!a) return;
  const sc = document.querySelector<HTMLElement>('[data-grid-scroll]');
  if (sc) {
    const r = sc.getBoundingClientRect();
    // enkel scrollen als de vinger/muis binnen de planner bij de rand komt (onder de daghoofdjes)
    const edge = 40;
    const top = r.top + 46;
    const inside = a.moved && a.x >= r.left && a.x <= r.right;
    let dy = 0;
    if (inside && a.y >= top && a.y < top + edge) dy = -10;
    else if (inside && a.y > r.bottom - edge && a.y <= r.bottom) dy = 10;
    // pas scrollen als je even aan de rand blijft, niet bij het voorbijschuiven
    if (!dy) edgeSince = 0;
    else if (!edgeSince) edgeSince = performance.now();
    if (dy && performance.now() - edgeSince > 300) {
      sc.scrollTop += dy;
      a.target = hitTest(a.x, a.y, a.payload.kind === 'block' ? a.payload.offset : 0);
    }
  }
  scrollRaf = requestAnimationFrame(autoScroll);
}

/**
 * Start een sleepbeweging. `onDrop` krijgt het doel; `onTap` wordt opgeroepen bij een gewone klik/tik.
 */
export function beginDrag(
  e: PointerEvent,
  payload: DragPayload,
  onDrop: (p: DragPayload, t: DropTarget) => void,
  onTap?: () => void,
): void {
  const offset = payload.kind === 'block' ? payload.offset : 0;
  startGesture(e, {
    onStart(x, y) {
      edgeSince = 0;
      drag.active = { payload, x, y, x0: x, y0: y, moved: false, target: hitTest(x, y, offset) };
      if (ui.drawerOpen) ui.drawerPeek = true;
      autoScroll();
    },
    onMove(x, y) {
      if (!drag.active) return;
      drag.active.x = x;
      drag.active.y = y;
      if (Math.hypot(x - drag.active.x0, y - drag.active.y0) > 24) drag.active.moved = true;
      drag.active.target = hitTest(x, y, offset);
    },
    onEnd(x, y) {
      const t = hitTest(x, y, offset);
      finish();
      if (t) onDrop(payload, t);
    },
    onCancel: finish,
    onTap,
  });
}

function finish() {
  cancelAnimationFrame(scrollRaf);
  drag.active = null;
  if (ui.drawerPeek) { ui.drawerPeek = false; ui.drawerOpen = false; }
}
