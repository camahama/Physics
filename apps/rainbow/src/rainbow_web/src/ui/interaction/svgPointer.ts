/** Map client coordinates to these diagrams' xMidYMid/meet SVG viewBox.
 * Use rendered bounds rather than getScreenCTM, so ancestor presentation
 * transforms and Safari page zoom use the same coordinate space as touches.
 * These SVG roots have no CSS border or padding.
 */
export function svgPointerPoint(svg: SVGSVGElement, pointer: { clientX: number; clientY: number }) {
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox.baseVal;
  const scale = Math.min(rect.width / box.width, rect.height / box.height);
  if (!(scale > 0)) return { x: box.x, y: box.y };
  const left = rect.left + (rect.width - box.width * scale) / 2;
  const top = rect.top + (rect.height - box.height * scale) / 2;
  return {
    x: box.x + (pointer.clientX - left) / scale,
    y: box.y + (pointer.clientY - top) / scale,
  };
}
