"use client";
import { useEffect, useState } from "react";
import { atlasTiles, type AtlasCamera, type AtlasTile } from "@/lib/activity-zoom";

const tileUrl = process.env.NEXT_PUBLIC_MEMORY_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
interface TileState extends AtlasTile { loaded: boolean; failed: boolean }
// Retain loaded lower-resolution layers underneath incoming detail tiles.
// Requests cover the current viewport only; no city-wide/offline prefetch.
export function AtlasTiles({ camera, width, height, unit, onReady, retry }: {
  camera: AtlasCamera; width: number; height: number; unit: number;
  onReady: (ready: boolean, failed: boolean) => void; retry: number;
}) {
  const required = atlasTiles(camera, width, height, unit);
  const signature = required.map(t => t.id).join("|");
  const [cache, setCache] = useState<{ signature: string; tiles: TileState[] }>({ signature: "", tiles: [] });
  if (cache.signature !== signature) {
    const ids = new Set(cache.tiles.map(t => t.id));
    const keep = cache.tiles.filter(t => t.loaded || required.some(n => n.id === t.id));
    setCache({ signature, tiles: [...keep, ...required.filter(t => !ids.has(t.id)).map(t => ({ ...t, loaded: false, failed: false }))].slice(-160) });
  }
  const tiles = cache.tiles;
  useEffect(() => {
    const needed = signature.split("|").filter(Boolean);
    onReady(needed.length > 0 && needed.every(id => tiles.some(t => t.id === id && t.loaded)), needed.some(id => tiles.some(t => t.id === id && t.failed)));
  }, [tiles, signature, onReady]);
  function finish(id: string, loaded: boolean) {
    setCache(old => ({ ...old, tiles: old.tiles.map(t => t.id === id ? { ...t, loaded, failed: !loaded } : t) }));
  }
  return <g data-map-layer="street-tiles" transform={`translate(${width/2} ${height/2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`}>
    {[...tiles].sort((a,b) => a.z-b.z).map(t => <image key={`${t.id}:${retry}`} data-tile={t.id} x={t.left} y={t.top} width={t.size+.02} height={t.size+.02} href={tileUrl.replace("{z}",String(t.z)).replace("{x}",String(t.x)).replace("{y}",String(t.y))} opacity={t.loaded?1:0} onLoad={() => finish(t.id,true)} onError={() => finish(t.id,false)}/>) }
  </g>;
}
