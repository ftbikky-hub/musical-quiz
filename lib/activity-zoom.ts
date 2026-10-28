import type { MemoryTower } from "./activity-map";
export interface AtlasCamera { x: number; y: number; zoom: number }
// Web Mercator at map zoom 5, shared by tile positions and venue anchors.
export function projectAtlas(longitude: number, latitude: number): [number, number] {
  const sin = Math.sin(latitude * Math.PI / 180);
  return [(longitude + 180) / 360 * 8192, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 8192];
}
const japanCentre = projectAtlas(137, 36);
export const ATLAS_FULL_VIEW: AtlasCamera = { x: japanCentre[0], y: japanCentre[1], zoom: .85 };
export function clusterAtlasTowers(towers: MemoryTower[], pixelScale: number) {
  const groups: { x: number; y: number; towers: MemoryTower[] }[] = [];
  for (const tower of towers) {
    const [x,y] = projectAtlas(tower.longitude,tower.latitude);
    const near = groups.find(g => Math.hypot(g.x-x,g.y-y)*pixelScale < 40);
    if (near) { near.towers.push(tower); const n = near.towers.length; near.x += (x-near.x)/n; near.y += (y-near.y)/n; }
    else groups.push({ x,y,towers:[tower] });
  }
  return groups.sort((a,b) => a.y-b.y);
}
export interface AtlasTile { id: string; z: number; x: number; y: number; left: number; top: number; size: number }
export function atlasTiles(camera: AtlasCamera, width: number, height: number, pixelUnit: number): AtlasTile[] {
  const z = Math.max(3, Math.min(17, Math.ceil(5 + Math.log2(camera.zoom / pixelUnit))));
  const size = 256 * 2 ** (5 - z), count = 2 ** z;
  const left = Math.max(0, Math.floor((camera.x - width / 2 / camera.zoom) / size));
  const right = Math.min(count - 1, Math.floor((camera.x + width / 2 / camera.zoom) / size));
  const top = Math.max(0, Math.floor((camera.y - height / 2 / camera.zoom) / size));
  const bottom = Math.min(count - 1, Math.floor((camera.y + height / 2 / camera.zoom) / size));
  const tiles: AtlasTile[] = [];
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) tiles.push({ id: `${z}/${x}/${y}`, z, x, y, left: x * size, top: y * size, size });
  return tiles;
}
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
