/** Interaction primitives shared by the SVG teaching tools. */
export type Point = { x: number; y: number };
export function svgClientPoint(svg: SVGSVGElement, event: { clientX: number; clientY: number }): Point {
  const matrix = svg.getScreenCTM();
  if (matrix) {
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    try {
      const transformed = point.matrixTransform(matrix.inverse());
      if (Number.isFinite(transformed.x) && Number.isFinite(transformed.y)) return transformed;
    } catch { /* A detached/zero-size SVG can have a singular screen matrix. */ }
  }
  const rect = svg.getBoundingClientRect(), box = svg.viewBox.baseVal;
  const scale = Math.min(rect.width / box.width, rect.height / box.height);
  if (!(scale > 0)) return { x: box.x, y: box.y };
  // All callers use the default xMidYMid meet aspect ratio.
  return {
    x: box.x + (event.clientX - rect.left - (rect.width - box.width * scale) / 2) / scale,
    y: box.y + (event.clientY - rect.top - (rect.height - box.height * scale) / 2) / scale,
  };
}
export function primaryPointer(event: PointerEvent) { return event.button === 0 && event.isPrimary !== false; }

/** Capture a stable owner, never the SVG children replaced during rendering.
 * Document listeners also keep dragging functional if capture is unavailable.
 */
export function pointerDrag(owner: Element, move: (e: PointerEvent) => void, end: (e: PointerEvent | null, cancelled: boolean) => void) {
  let id: number | null = null;
  const doc = owner.ownerDocument;
  function finish(event: PointerEvent | null, cancelled: boolean) {
    if (id === null || (event && event.pointerId !== id)) return;
    const old = id; id = null;
    doc.removeEventListener('pointermove', onMove, true);
    doc.removeEventListener('pointerup', onUp, true);
    doc.removeEventListener('pointercancel', onCancel, true);
    doc.removeEventListener('visibilitychange', onVisibility);
    doc.defaultView?.removeEventListener('blur', onBlur);
    owner.removeEventListener('lostpointercapture', onLost);
    try { if (owner.hasPointerCapture(old)) owner.releasePointerCapture(old); } catch { /* Already released. */ }
    end(event, cancelled);
  }
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== id) return;
    if (!owner.isConnected || (event.pointerType === 'mouse' && event.buttons === 0)) { finish(event, true); return; }
    move(event);
  };
  const onUp = (event: PointerEvent) => finish(event, false);
  const onCancel = (event: PointerEvent) => finish(event, true);
  const onLost = (event: Event) => finish(event as PointerEvent, true);
  const onBlur = () => finish(null, true);
  const onVisibility = () => { if (doc.hidden) finish(null, true); };
  return {
    get active() { return id !== null; },
    start(event: PointerEvent) {
      if (!primaryPointer(event) || id !== null) return false;
      id = event.pointerId;
      doc.addEventListener('pointermove', onMove, true);
      doc.addEventListener('pointerup', onUp, true);
      doc.addEventListener('pointercancel', onCancel, true);
      doc.addEventListener('visibilitychange', onVisibility);
      doc.defaultView?.addEventListener('blur', onBlur);
      owner.addEventListener('lostpointercapture', onLost);
      try { owner.setPointerCapture(id); } catch { /* Document listeners remain active. */ }
      return true;
    },
    cancel() { finish(null, true); },
  };
}

let nativePalette: { board: SVGSVGElement; drop: (point: Point) => void } | null = null;
const nativeBoards = new WeakSet<SVGSVGElement>();

/** Keep the platform drag image for mouse/trackpad; use pointer dragging on touch. */
export function paletteDrag(button: HTMLButtonElement, board: SVGSVGElement, activate: () => void, drop: (point: Point) => void, activation: 'click' | 'dblclick' = 'click') {
  let startX = 0, startY = 0, moved = false, suppressClick = false, lastTap = -Infinity;
  let ghost: HTMLElement | null = null;
  const dropInside = (event: {clientX:number;clientY:number}, callback: (point: Point) => void) => {
    const point = svgClientPoint(board, event), box = board.viewBox.baseVal;
    if (point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height) callback(point);
  };
  const drag = pointerDrag(button, event => {
    if (Math.hypot(event.clientX - startX, event.clientY - startY) >= 6) moved = true;
    if (moved && !ghost) {
      ghost = button.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true');
      Object.assign(ghost.style, {position:'fixed',pointerEvents:'none',zIndex:'10000',opacity:'.75',width:`${button.getBoundingClientRect().width}px`,margin:'0'});
      button.ownerDocument.body.append(ghost);
    }
    if (ghost) { ghost.style.left=`${event.clientX+12}px`;ghost.style.top=`${event.clientY+12}px`; }
  }, (event, cancelled) => {
    ghost?.remove(); ghost = null; suppressClick = moved;
    if (cancelled || !event) return;
    if (moved) { lastTap=-Infinity; dropInside(event, drop); }
    else {
      suppressClick=true;
      const now=performance.now();
      if (activation==='click' || now-lastTap<600) { lastTap=-Infinity;activate(); }
      else lastTap=now;
    }
  });
  if (!nativeBoards.has(board)) {
    nativeBoards.add(board);
    board.addEventListener('dragover', event => {
      if (nativePalette?.board === board) { event.preventDefault(); if(event.dataTransfer)event.dataTransfer.dropEffect='copy'; }
    });
    board.addEventListener('drop', event => {
      if (nativePalette?.board !== board) return;
      event.preventDefault();
      const pending=nativePalette;nativePalette=null;
      dropInside(event,pending.drop);
    });
  }
  button.draggable = true;
  button.addEventListener('dragstart', event => {
    suppressClick=true;
    nativePalette={board,drop};
    if(event.dataTransfer){event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData('text/plain',button.textContent || 'component');}
  });
  button.addEventListener('dragend', () => { nativePalette=null; });
  button.addEventListener('pointerdown', event => {
    suppressClick=false;
    if (event.pointerType === 'mouse' || !drag.start(event)) return;
    event.preventDefault();
    startX = event.clientX; startY = event.clientY; moved = false;
  });
  button.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); return; }
    if (activation === 'click' && (event.detail === 0 || event.detail === 1)) activate();
  });
  if (activation === 'dblclick') button.addEventListener('dblclick', () => { if(!suppressClick)activate(); });
}
