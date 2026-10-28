export interface AtlasCamera { x: number; y: number; zoom: number }
export const ATLAS_FULL_VIEW: AtlasCamera = { x: 480, y: 310, zoom: 1 };
export function atlasEase(t: number) { return t * t * (3 - 2 * t); }
// Scale about one fixed screen anchor. Independent centre interpolation causes
// the camera to pan across the country while already zoomed in.
export function zoomAtlasCamera(from: AtlasCamera, to: AtlasCamera, fraction: number): AtlasCamera {
  const t = atlasEase(Math.max(0, Math.min(1, fraction)));
  const zoom = Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * t);
  if (Math.abs(to.zoom - from.zoom) < 1e-9) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, zoom };
  const px = (to.x * to.zoom - from.x * from.zoom) / (to.zoom - from.zoom);
  const py = (to.y * to.zoom - from.y * from.zoom) / (to.zoom - from.zoom);
  return { x: px + (from.x - px) * from.zoom / zoom, y: py + (from.y - py) * from.zoom / zoom, zoom };
}
