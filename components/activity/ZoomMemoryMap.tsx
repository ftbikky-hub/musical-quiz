"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ActivityRecord } from "@/lib/activity";
import { clusterTowers, MAP_COLORS, projectPlace, shortVenue, spreadTowerLabels, towerFloorHeight, venueKey, type MemoryTower } from "@/lib/activity-map";
import { ATLAS_FULL_VIEW, atlasEase, zoomAtlasCamera } from "@/lib/activity-zoom";
import outline from "@/data/japan-outline.json";
import styles from "./map.module.css";

const land = outline.map(ring => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${projectPlace(lon, lat).join(",")}`).join("") + "Z").join("");
const phases = ["wide", "zoom", "build", "hold", "out"] as const;
const captions = ["日本全体を眺めています", "目的地へ、ゆっくり寄ります", "この場所に、思い出が一段", "会場ごとの回数を眺める", "日本全体へ戻ります"];

export function ZoomMemoryMap({ towers, allTowers, day, running, speed, follow, onComplete, onSelect }: {
  towers: MemoryTower[]; allTowers: MemoryTower[];
  day: { date: string; records: ActivityRecord[] } | null;
  running: boolean; speed: number; follow: boolean;
  onComplete: () => void; onSelect: (keys: string[]) => void;
}) {
  const svg = useRef<SVGSVGElement>(null), [width, setWidth] = useState(960);
  const [reduced, setReduced] = useState(false);
  const [elapsed, setElapsed] = useState(() => running ? 0 : Infinity);
  const clock = useRef(elapsed), completed = useRef(false), callback = useRef(onComplete);
  useEffect(() => { callback.current = onComplete; }, [onComplete]);
  const pattern = useId().replace(/:/g, "");
  const durations = [1400, 3000, 1100, speed === 3500 ? 4000 : speed === 900 ? 1200 : 2400, 2700].map(ms => reduced ? 120 : ms);
  const total = durations.reduce((a, b) => a + b, 0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches); update();
    media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { if (entries[0]?.contentRect.width) setWidth(entries[0].contentRect.width); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!running || !day) return;
    let frame = 0, last: number | null = null;
    function tick(now: number) {
      const delta = last === null ? 0 : Math.min(100, now - last); last = now;
      clock.current = Math.min(total, clock.current + delta); setElapsed(clock.current);
      if (clock.current >= total) { if (!completed.current) { completed.current = true; callback.current(); } return; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [running, total, day]);

  let phase = 0, offset = 0;
  while (phase < 4 && elapsed >= offset + durations[phase]) { offset += durations[phase]; phase++; }
  const fraction = Math.min(1, (elapsed - offset) / durations[phase]);
  const activeKeys = new Set(day?.records.map(r => venueKey(r.venue, r.city)) || []);
  const targets = allTowers.filter(t => activeKeys.has(t.key));
  const points = targets.map(t => projectPlace(t.longitude, t.latitude));
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const spanX = points.length ? Math.max(...xs) - Math.min(...xs) : 0, spanY = points.length ? Math.max(...ys) - Math.min(...ys) : 0;
  // Fit all same-day venues rather than inventing an order between them.
  const zoom = Math.max(1, Math.min(160, 520 / Math.max(.01, spanX), 300 / Math.max(.01, spanY)));
  const local = points.length ? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 + 30 / zoom, zoom } : ATLAS_FULL_VIEW;
  const camera = !follow || !day || reduced ? ATLAS_FULL_VIEW : phase === 1 ? zoomAtlasCamera(ATLAS_FULL_VIEW, local, fraction) : phase === 4 ? zoomAtlasCamera(local, ATLAS_FULL_VIEW, fraction) : phase === 0 ? ATLAS_FULL_VIEW : local;
  const unit = 960 / width, viewHeight = Math.max(620, 350 * unit), floorHeight = towerFloorHeight(allTowers);
  const arrived = phase >= 2;
  const currentIds = new Set(day?.records.map(r => r.id) || []);
  const shown = towers.map(t => ({ ...t, records: arrived ? t.records : t.records.filter(r => !currentIds.has(r.id)) })).filter(t => t.records.length);
  const screen = (x: number, y: number) => ({ x: 480 + (x - camera.x) * camera.zoom, y: viewHeight / 2 + (y - camera.y) * camera.zoom });
  const groups = clusterTowers(shown, camera.zoom / unit);
  const detailed = camera.zoom > 30;
  const positions = allTowers.map(t => { const [x, y] = projectPlace(t.longitude, t.latitude); return { key: t.key, ...screen(x, y), height: floorHeight * t.records.length * unit }; }).filter(p => p.x > 50 * unit && p.x < 960 - 50 * unit && p.y > 0 && p.y < viewHeight - 20);
  // Keep active destinations at their geographic anchors; let neighbours part
  // gradually during zoom, with leader lines to their actual locations.
  const laidOut = spreadTowerLabels(positions.map(p => ({ ...p, key: `${activeKeys.has(p.key) ? "0" : "1"}:${p.key}`, x: p.x / unit, y: p.y / unit, height: p.height / unit })), 960 / unit, viewHeight / unit).map(p => ({ ...p, key: p.key.slice(2) }));
  const separation = atlasEase(Math.max(0, Math.min(1, (Math.log(camera.zoom) - Math.log(30)) / (Math.log(160) - Math.log(30)))));
  const draw = detailed ? shown.map(t => { const [x, y] = projectPlace(t.longitude, t.latitude), anchor = screen(x, y), p = laidOut.find(p => p.key === t.key); return { towers: [t], x: anchor.x + ((p?.x ?? anchor.x / unit) * unit - anchor.x) * separation, y: anchor.y + ((p?.y ?? anchor.y / unit) * unit - anchor.y) * separation, anchor }; }) : groups.map(g => ({ ...g, ...screen(g.x, g.y), anchor: screen(g.x, g.y) }));
  return <div className={styles.zoomReplay}>
    <div className={styles.zoomStage}><span>{!day ? "YOUR MEMORY ATLAS" : captions[phase]}</span><span>{phase === 0 || phase === 4 || !follow ? "JAPAN / 全国" : "YOUR NEXT MEMORY"}</span></div>
    <svg ref={svg} className={styles.zoomMap} viewBox={`0 0 960 ${viewHeight}`} role="group" aria-label="全国から目的地へズームする思い出の地図" data-phase={phases[phase]} data-zoom={camera.zoom.toFixed(3)}>
      <defs><pattern id={pattern} width="75" height="75" patternUnits="userSpaceOnUse"><path d="M75 0H0V75" fill="none" stroke="#b7bea3" strokeWidth=".6"/></pattern></defs>
      <g transform={`translate(480 ${viewHeight / 2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`}><path d={land} transform="translate(0 7)" fill="#b6c0a4" opacity=".6"/><path d={land} fill="#e5e1ca" stroke="#fdf9ec" strokeWidth="1.3" vectorEffect="non-scaling-stroke"/></g>
      <rect width="960" height={viewHeight} fill={`url(#${pattern})`} opacity={Math.max(0, Math.min(.45, (Math.log2(camera.zoom) - 1) / 10))} pointerEvents="none"/>
      {camera.zoom < 6 && [["北海道",143,43.4],["東北",141,39],["関東",141,35.4],["中部",137.4,37],["関西",134.6,35.9],["九州",129,32],["沖縄",128,26]].map(([name, lon, lat]) => { const [x, y] = projectPlace(Number(lon), Number(lat)), p = screen(x, y); return <text key={name} x={p.x} y={p.y} fontSize={11 * unit} fill="#7c896e">{name}</text>; })}
      {phase < 2 && targets.map(t => { const [x,y] = projectPlace(t.longitude,t.latitude), p = screen(x,y); return <circle key={t.key} cx={p.x} cy={p.y} r={12 * unit} fill="#c2a35b" fillOpacity=".3" stroke="#ac8a39" strokeWidth={unit}/>; })}
      {draw.map(g => {
        if (g.x < -80 || g.x > 1040 || g.y < -100 || g.y > viewHeight + 100) return null;
        const entries = g.towers.flatMap(t => t.records).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const before = entries.filter(r => !currentIds.has(r.id)).length;
        const height = floorHeight * (phase === 2 ? before + (entries.length - before) * Math.min(1, fraction * 2) : entries.length);
        const bands = Math.min(60, entries.length), active = g.towers.some(t => activeKeys.has(t.key));
        const name = g.towers.length > 1 ? `${g.towers.length}会場 ＋` : shortVenue(g.towers[0].venue);
        return <g key={g.towers.map(t => t.key).join("|")} data-venue={g.towers.map(t => t.venue).join(" / ")} data-count={entries.length}>
          {detailed && Math.hypot(g.x-g.anchor.x,g.y-g.anchor.y)>3 && <path d={`M${g.anchor.x},${g.anchor.y}L${g.x},${g.y}`} stroke="#b49a54" strokeWidth={unit} strokeDasharray={`${3*unit} ${4*unit}`}/>}
          <g transform={`translate(${g.x} ${g.y}) scale(${unit})`} className={styles.tower} role="button" tabIndex={0} aria-label={`${g.towers.map(t => t.venue).join("・")}、${entries.length}回、記録を見る`} onClick={() => onSelect(g.towers.map(t => t.key))} onKeyDown={e => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(g.towers.map(t => t.key)); } }}>
            <title>{g.towers.map(t => `${t.venue} ${t.records.length}回`).join(" / ")}</title><ellipse cx="3" cy="5" rx="22" ry="8" fill="#31513b" opacity=".13"/><rect x="-24" y={-height-37} width="50" height={height+80} fill="transparent"/>
            {Array.from({length:bands},(_,i) => { const y=-height*i/bands,h=height/bands,color=MAP_COLORS[entries[Math.floor(i*entries.length/bands)].kind]; return <g key={i}><path d={`M-13,${y}L5,${y+6}L5,${y+6-h}L-13,${y-h}Z`} fill={color}/><path d={`M5,${y+6}L19,${y-1}L19,${y-1-h}L5,${y+6-h}Z`} fill={color} filter="brightness(.75)"/><path d={`M-13,${y-h}L1,${y-h-7}L19,${y-h-1}L5,${y-h+6}Z`} fill={active&&i===bands-1?"#bda15c":color} stroke="#fff8e6" strokeWidth=".35"/></g>; })}
            <rect x="-21" y={-height-33} width="48" height="23" rx="12" fill="#fffdf0" stroke="#c0a65e"/><text x="3" y={-height-17} textAnchor="middle" className={styles.count}>{entries.length}回</text>
            {(detailed || active) && <><rect x="-66" y="17" width="138" height="27" rx="3" fill="#fffdf1" stroke="#d3d5bc"/><text x="3" y="34" textAnchor="middle" fontSize="10" fill="#365744" textLength={name.length>13?126:undefined} lengthAdjust="spacingAndGlyphs">{name}</text></>}
          </g>
        </g>;
      })}
    </svg>
    <div className={styles.zoomDestination} aria-label="目的地と作品名"><small>{phase < 2 ? "次の目的地" : phase === 4 ? "全国へ、そして次の思い出へ" : "この日の思い出"}</small>{day ? <><time>{day.date.replaceAll("-", ".")}</time>{day.records.map(r => <div key={r.id}><h3>{r.venue}<span>{r.city}</span></h3><p>{r.title}</p></div>)}</> : <><h3>好きに会いに行った、日本の地図。</h3><p>全国から目的地へ寄り、思い出の塔をひとつずつ。</p></>}</div>
  </div>;
}
