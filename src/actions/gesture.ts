/**
 * Eén gebaar voor muis, pen en vinger.
 * - Muis: slepen start na een paar pixels beweging.
 * - Aanraken: lang indrukken (≈ 0,4 s) en dan slepen. Beweegt de vinger eerder, dan scrollt de pagina gewoon.
 */
export interface GestureHandlers {
  onStart?(x: number, y: number): void;
  onMove?(x: number, y: number): void;
  /** moved = er werd effectief gesleept na de start */
  onEnd?(x: number, y: number, moved: boolean): void;
  onCancel?(): void;
  /** kort tikken/klikken zonder slepen */
  onTap?(): void;
}

export interface GestureOptions {
  /** start meteen (bv. de rand om de duur te wijzigen) */
  immediate?: boolean;
  longPressMs?: number;
}

const MOUSE_THRESHOLD = 4;
const TOUCH_SLOP = 8;

let activeGesture = false;
export function gestureActive(): boolean {
  return activeGesture;
}

export function startGesture(e: PointerEvent, h: GestureHandlers, opts: GestureOptions = {}): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const x0 = e.clientX, y0 = e.clientY;
  const isMouse = e.pointerType === 'mouse';
  let started = false, moved = false, done = false;
  let lx = x0, ly = y0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const preventTouch = (ev: TouchEvent) => { if (started) ev.preventDefault(); };
  const preventMenu = (ev: Event) => ev.preventDefault();

  const begin = () => {
    if (started) return;
    started = true;
    activeGesture = true;
    if (!isMouse) navigator.vibrate?.(10);
    h.onStart?.(x0, y0);
  };

  const cleanup = () => {
    done = true;
    clearTimeout(timer);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
    document.removeEventListener('touchmove', preventTouch);
    window.removeEventListener('contextmenu', preventMenu);
    // klik na slepen negeren
    setTimeout(() => { activeGesture = false; }, 0);
  };

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId || done) return;
    lx = ev.clientX; ly = ev.clientY;
    const dist = Math.hypot(lx - x0, ly - y0);
    if (!started) {
      if (isMouse && dist > MOUSE_THRESHOLD) begin();
      else if (!isMouse && dist > TOUCH_SLOP) { cleanup(); return; } // gebruiker scrollt
      else return;
    }
    if (dist > MOUSE_THRESHOLD) moved = true;
    h.onMove?.(lx, ly);
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId || done) return;
    const wasStarted = started;
    cleanup();
    if (wasStarted) h.onEnd?.(ev.clientX, ev.clientY, moved);
    else { activeGesture = false; h.onTap?.(); }
  };
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId || done) return;
    const wasStarted = started;
    cleanup();
    if (wasStarted) h.onCancel?.();
  };
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return;
    const wasStarted = started;
    cleanup();
    if (wasStarted) h.onCancel?.();
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key);
  document.addEventListener('touchmove', preventTouch, { passive: false });
  window.addEventListener('contextmenu', preventMenu);

  if (opts.immediate) begin();
  else if (!isMouse) timer = setTimeout(begin, opts.longPressMs ?? 400);
}
