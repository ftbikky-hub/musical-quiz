"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Feature, MultiPolygon } from "geojson";
import { MAP_COLORS, shortVenue, spreadTowerLabels, towerFloorHeight, type MemoryTower } from "@/lib/activity-map";
import { createMemoryMapGate, type MemoryMapReadiness } from "@/lib/activity-map-readiness";
import outline from "@/data/japan-outline.json";
import styles from "./map.module.css";

export interface MemoryMapFocus { id: string; keys: string[]; maxZoom?: number; minZoom?: number; replay?: boolean }
const tileUrl = process.env.NEXT_PUBLIC_MEMORY_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export function StreetMemoryMap({ towers, allTowers, activeKeys, focus, onSelect, onReadiness }: { towers: MemoryTower[]; allTowers: MemoryTower[]; activeKeys: string[]; focus: MemoryMapFocus | null; onSelect: (keys: string[]) => void; onReadiness: (state: MemoryMapReadiness) => void }) {
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<Leaflet.Map | null>(null), groupRef = useRef<Leaflet.LayerGroup | null>(null), leafletRef = useRef<typeof Leaflet | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const lastFocus = useRef("");
  const gateRef = useRef<ReturnType<typeof createMemoryMapGate> | null>(null), tileRef = useRef<Leaflet.TileLayer | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    let observer: ResizeObserver | undefined;
    import("leaflet").then(L => {
      if (!alive || !container.current) return;
      leafletRef.current = L;
      const map = L.map(container.current, { zoomControl: false, minZoom: 4, maxZoom: 19, scrollWheelZoom: true, zoomSnap: .5, zoomDelta: 1, keyboard: true });
      mapRef.current = map;
      const gate = createMemoryMapGate(onReadiness); gateRef.current = gate;
      map.fitBounds([[24, 123], [46, 146]], { padding: [12, 12], animate: false });
      // A local outline remains visible while distant street tiles are arriving.
      map.createPane("memory-land").style.zIndex = "150";
      const land: Feature<MultiPolygon> = { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: outline.map(ring => [ring]) } };
      L.geoJSON(land, { pane: "memory-land", interactive: false, style: { color: "#c4cbb4", weight: 1, fillColor: "#f5f0df", fillOpacity: 1 } }).addTo(map);
      L.control.zoom({ position: "topright", zoomInTitle: "地図を拡大", zoomOutTitle: "地図を縮小" }).addTo(map);
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      // Browser caching/referrers are preserved; only currently visible tiles are fetched.
      const tiles = L.tileLayer(tileUrl, { maxZoom: 19, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' });
      tileRef.current = tiles;
      tiles.on("loading", () => gate.tileStart());
      tiles.on("load", () => gate.tileEnd());
      tiles.on("tileerror", () => { gate.tileError(); if (alive) setError("背景地図を読み込めませんでした。会場ごとの塔を残し、再生は待機しています。"); });
      map.on("movestart", () => gate.moveStart());
      map.on("moveend", () => gate.moveEnd(tiles.isLoading()));
      tiles.addTo(map);
      groupRef.current = L.layerGroup().addTo(map);
      map.on("moveend zoomend resize", () => drawRef.current());
      observer = new ResizeObserver(() => map.invalidateSize({ pan: false })); observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (alive) setError("詳細地図を開けませんでした。「日本全体」で概略図に戻ってください。"); });
    return () => { alive = false; gateRef.current?.dispose(); observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; groupRef.current = null; tileRef.current = null; };
  }, [onReadiness]);

  useEffect(() => {
    function draw() {
      const map = mapRef.current, L = leafletRef.current, group = groupRef.current; if (!map || !L || !group) return;
      group.clearLayers();
      const size = map.getSize(), unit = towerFloorHeight(allTowers), detailed = focus?.replay || map.getZoom() >= 14;
      const visibleKeys = new Set(towers.map(t => t.key));
      const positions = allTowers.map(t => { const point = map.latLngToContainerPoint([t.latitude, t.longitude]); return { key: t.key, x: point.x, y: point.y, height: unit * t.records.length }; }).filter(p => p.x > -80 && p.x < size.x + 80 && p.y > -80 && p.y < size.y + 160);
      if (!detailed) {
        const groups: { x: number; y: number; towers: MemoryTower[] }[] = [];
        for (const t of towers) {
          const p = map.latLngToContainerPoint([t.latitude, t.longitude]);
          if (p.x < -60 || p.x > size.x + 60 || p.y < -60 || p.y > size.y + 80) continue;
          const near = groups.find(g => Math.hypot(g.x - p.x, g.y - p.y) < 65);
          if (near) near.towers.push(t); else groups.push({ x: p.x, y: p.y, towers: [t] });
        }
        for (const g of groups) {
          const total = g.towers.reduce((n, t) => n + t.records.length, 0), area = [...new Set(g.towers.map(t => t.city).filter(Boolean))].slice(0, 2).join("・"), label = `${area}、${g.towers.length}会場・${total}回。拡大する`;
          const button = document.createElement("button"); button.type = "button"; button.className = styles.areaMarker; button.setAttribute("aria-label", label);
          const count = document.createElement("strong"); count.textContent = `${total}回`; const name = document.createElement("span"); name.textContent = `${g.towers.length}会場 ＋`; const areaName = document.createElement("small"); areaName.textContent = area; button.append(count, areaName, name);
          const point = map.containerPointToLatLng([g.x, g.y]);
          L.marker(point, { icon: L.divIcon({ html: button, className: styles.streetIcon, iconSize: [90, 70], iconAnchor: [45, 55] }), keyboard: false }).addTo(group);
          button.onclick = () => {
            map.stop();
            const bounds = L.latLngBounds(g.towers.map(t => [t.latitude, t.longitude] as [number, number]));
            // Even on a narrow phone, a cluster click must reach individual venues.
            const zoom = Math.max(14, Math.min(17, map.getBoundsZoom(bounds, false, L.point(150, 150))));
            map.setView(bounds.getCenter(), zoom, { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
          };
        }
        return;
      }
      const laidOut = spreadTowerLabels(positions, size.x, size.y);
      for (const p of laidOut) {
        if (!visibleKeys.has(p.key)) continue;
        const tower = towers.find(t => t.key === p.key)!;
        const anchor = L.latLng(tower.latitude, tower.longitude), display = map.containerPointToLatLng([p.x, p.y]);
        const active = activeKeys.includes(tower.key), height = unit * tower.records.length;
        const screenAnchor = map.latLngToContainerPoint(anchor);
        if (Math.hypot(screenAnchor.x - p.x, screenAnchor.y - p.y) > 3) L.polyline([anchor, display], { color: active ? "#ad8537" : "#587a68", weight: 1.5, opacity: .85, dashArray: "3 4", interactive: false }).addTo(group);
        L.circleMarker(anchor, { radius: 3, color: "#315b49", fillColor: "#fff9dc", fillOpacity: 1, weight: 1.5, interactive: false }).addTo(group);
        const button = document.createElement("button"); button.type = "button"; button.className = `${styles.streetTower} ${active ? styles.streetActive : ""}`;
        button.setAttribute("aria-label", `${tower.venue}、${tower.records.length}回、記録を見る`); button.title = `${tower.venue} ${tower.records.length}回`;
        const count = document.createElement("strong"); count.className = styles.streetCount; count.textContent = `${tower.records.length}回`;
        const art = document.createElementNS("http://www.w3.org/2000/svg", "svg"); art.setAttribute("width", "48"); art.setAttribute("height", `${height + 12}`); art.setAttribute("viewBox", `-20 ${-height - 7} 48 ${height + 12}`); art.setAttribute("aria-hidden", "true");
        const entries = [...tower.records].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const bands = Math.min(60, entries.length);
        for (let i = 0; i < bands; i++) {
          const y = -height * i / bands, h = height / bands, color = MAP_COLORS[entries[Math.floor(i * entries.length / bands)].kind];
          for (const [path, dark] of [[`M-12,${y} L5,${y + 5} L5,${y + 5 - h} L-12,${y - h}Z`, false], [`M5,${y + 5} L17,${y - 1} L17,${y - 1 - h} L5,${y + 5 - h}Z`, true], [`M-12,${y - h} L0,${y - h - 6} L17,${y - h - 1} L5,${y - h + 5}Z`, false]] as const) {
            const face = document.createElementNS("http://www.w3.org/2000/svg", "path"); face.setAttribute("d", path); face.setAttribute("fill", color); face.setAttribute("stroke", "#fff6d9"); face.setAttribute("stroke-width", ".35"); if (dark) face.style.filter = "brightness(.75)"; art.append(face);
          }
        }
        const name = document.createElement("span"); name.className = styles.streetVenue; name.textContent = shortVenue(tower.venue);
        button.append(count, art, name); button.onclick = () => onSelect([tower.key]);
        L.marker(display, { icon: L.divIcon({ html: button, className: styles.streetIcon, iconSize: [140, height + 76], iconAnchor: [70, height + 35] }), keyboard: false, zIndexOffset: active ? 1000 : 0 }).addTo(group);
      }
    }
    drawRef.current = draw; if (ready) draw();
  }, [towers, allTowers, activeKeys, onSelect, ready, focus?.replay]);

  useEffect(() => {
    const map = mapRef.current, L = leafletRef.current;
    if (!ready || !map || !L || !focus || focus.id === lastFocus.current) return;
    const locations = allTowers.filter(t => focus.keys.includes(t.key)); if (!locations.length) return;
    lastFocus.current = focus.id; gateRef.current?.begin(focus.id); map.stop();
    const bounds = L.latLngBounds(locations.map(t => [t.latitude, t.longitude] as [number, number]));
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zoom = Math.max(focus.minZoom || 4, Math.min(focus.maxZoom || 16, map.getBoundsZoom(bounds, false, L.point(130, 235))));
    const centre = bounds.getCenter();
    const sameView = map.getCenter().distanceTo(centre) < 1 && Math.abs(map.getZoom() - zoom) < .01;
    map.flyTo(centre, zoom, { duration: focus.replay ? 1.3 : .7, animate });
    if (sameView || !animate) gateRef.current?.moveEnd(tileRef.current?.isLoading() || false);
  }, [focus, allTowers, ready]);

  return <div className={styles.streetWrap}><div ref={container} className={styles.streetMap} role="region" aria-label="会場ごとの塔を表示する詳細地図"/>{!ready && !error && <p className={styles.streetNotice} role="status">街の地図を広げています…</p>}{error && <div className={styles.streetNotice} role="status"><p>{error}</p><button type="button" onClick={() => { setError(""); gateRef.current?.retry(); tileRef.current?.redraw(); }}>地図を再読み込み</button></div>}<p className={styles.streetHint}>指2本・ホイール・＋−で拡大縮小<br/>点が会場の位置。線の先の塔は見やすく離しています。</p></div>;
}
