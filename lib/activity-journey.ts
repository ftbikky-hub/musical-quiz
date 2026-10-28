import { projectPlace } from "./activity-map";
export interface JourneyView { x: number; y: number; zoom: number }
export function journeyDestination(points: { longitude: number; latitude: number }[]): JourneyView | null {
  if (!points.length) return null;
  const projected = points.map(p => projectPlace(p.longitude, p.latitude));
  const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
  const west = Math.min(...xs), east = Math.max(...xs), north = Math.min(...ys), south = Math.max(...ys);
  // Stay at a regional scale; street-level inspection is a separate manual action.
  const zoom = Math.max(1, Math.min(2.8, 760 / (east - west + 80), 450 / (south - north + 100)));
  return { x: (west + east) / 2, y: (north + south) / 2 - 35 / zoom, zoom };
}
export function journeyDuration(from: JourneyView, to: JourneyView) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance < .5 && Math.abs(from.zoom - to.zoom) < .01) return 0;
  return Math.min(1700, 800 + distance * 4);
}
export function journeyFrame(from: JourneyView, to: JourneyView, fraction: number): JourneyView {
  const t = Math.max(0, Math.min(1, fraction));
  const ease = (n: number) => n * n * (3 - 2 * n);
  const position = ease(t), distance = Math.hypot(to.x - from.x, to.y - from.y);
  let zoom: number;
  if (distance > 90) {
    const wide = Math.min(from.zoom, to.zoom, 1.3);
    zoom = t < .45 ? from.zoom + (wide - from.zoom) * ease(t / .45) : wide + (to.zoom - wide) * ease((t - .45) / .55);
  } else zoom = from.zoom + (to.zoom - from.zoom) * position;
  return { x: from.x + (to.x - from.x) * position, y: from.y + (to.y - from.y) * position, zoom };
}
