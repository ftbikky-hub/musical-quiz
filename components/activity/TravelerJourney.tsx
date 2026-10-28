"use client";
import { useEffect, useId, useRef, useState } from "react";
import outline from "@/data/japan-outline.json";
import { projectPlace, type MemoryTower } from "@/lib/activity-map";
import { travelScene } from "@/lib/activity-travel-scene";
import styles from "./map.module.css";

const land = outline.map(ring => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${projectPlace(lon, lat).join(",")}`).join("") + "Z").join("");
export interface TravelerStop { latitude: number; longitude: number; label: string; venue?: string }
export function TravelerJourney({ id, from, to, places, running, duration, mapReady, failed, onComplete, onRetry }: { id: string; from: TravelerStop; to: TravelerStop; places: MemoryTower[]; running: boolean; duration: number; mapReady: boolean; failed: boolean; onComplete: (id: string) => void; onRetry: () => void }) {
  const [progress, setProgress] = useState(running ? 0 : 1);
  const elapsed = useRef(running ? 0 : duration);
  const previousDuration = useRef(duration);
  useEffect(() => {
    elapsed.current = elapsed.current / previousDuration.current * duration;
    previousDuration.current = duration;
    let frame = 0, previous: number | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function tick(time: number) {
      if (reduced) elapsed.current = duration;
      else if (running && previous !== undefined) elapsed.current += Math.min(100, time - previous);
      previous = time;
      const p = Math.min(1, elapsed.current / duration); setProgress(p);
      if (p === 1) onComplete(id);
      else if (running) frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [id, running, duration, onComplete]);
  const patternId = useId().replace(/:/g, "");
  const [width, setWidth] = useState(1000), [sceneHeight, setSceneHeight] = useState(570);
  const sceneElement = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = sceneElement.current; if (!element) return;
    const observer = new ResizeObserver(entries => { if (entries[0]?.contentRect.width) { setWidth(entries[0].contentRect.width); setSceneHeight(1000 * entries[0].contentRect.height / entries[0].contentRect.width); } });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const scene = travelScene(from, to, progress, sceneHeight);
  const direction = scene.angle > 90 || scene.angle < -90 ? -1 : 1;
  const rotation = direction < 0 ? scene.angle + (scene.angle > 90 ? -180 : 180) : scene.angle;
  const symbolScale = 1000 / width / scene.zoom;
  const screenPoint = (p: number[]) => [500 + (p[0] - scene.camera[0]) * scene.zoom, sceneHeight/2 + (p[1] - scene.camera[1]) * scene.zoom];
  const nearbyPlaces = places.map(place => ({ place, point: projectPlace(place.longitude, place.latitude) })).filter(({ point }) => { const [x, y] = screenPoint(point); return x > 35 && x < 965 && y > 50 && y < 520; });
  return <div className={`${styles.travelerJourney} ${styles.expressJourney}`} aria-label="列車が地図を移動するアニメーション">
    <header className={styles.expressHeader}><p>THEATRE NOTES / MEMORY EXPRESS</p><div className={styles.expressStations}><div><small>{scene.nearby ? "NEXT STAGE" : "DEPARTURE"}</small><strong>{scene.nearby ? "思い出の旅" : from.label}</strong><span>{scene.nearby ? "会場へ、チェックイン" : from.venue || "前の訪問先"}</span></div><b aria-hidden="true">→</b><div><small>ARRIVAL</small><strong>{to.label}</strong><span>{to.venue || "次の訪問先"}</span></div></div></header>
    <div className={styles.expressViewport}>
    <svg ref={sceneElement} viewBox={`0 0 1000 ${sceneHeight}`} className={styles.travelerJapan} role="img" aria-label={`${from.label}から${to.label}へ、列車と地図が動く演出`}>
      <defs><pattern id={patternId} width="70" height="70" patternUnits="userSpaceOnUse" patternTransform={`translate(${-scene.camera[0]*scene.zoom%70} ${-scene.camera[1]*scene.zoom%70})`}><path d="M70 0H0V70" fill="none" stroke="#b4c2ac" strokeWidth="1" opacity=".28"/></pattern></defs>
      <rect width="1000" height={sceneHeight} fill="#e9efdf"/>
      <g transform={scene.mapTransform} className={styles.expressMovingMap} data-scene-zoom={scene.zoom.toFixed(2)}>
        <path d={land} fill="#f4f0df" stroke="#d2d6bf" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
        <path d={scene.path} fill="none" stroke="#c4c4ac" strokeWidth="7" vectorEffect="non-scaling-stroke"/>
        <path d={scene.path} fill="none" stroke="#718d74" strokeWidth="2" strokeDasharray="2 7" vectorEffect="non-scaling-stroke"/>
        <path d={scene.path} pathLength="1" fill="none" stroke="#bb9447" strokeWidth="4" strokeDasharray="1" strokeDashoffset={1-progress*progress*(3-2*progress)} vectorEffect="non-scaling-stroke" className={styles.expressTrail}/>
        {nearbyPlaces.map(({place,point}) => <g key={place.key} transform={`translate(${point.join(" ")}) scale(${symbolScale})`}><circle r="3" fill="#6e8a70"/>{nearbyPlaces.length <= 6 && <text x="8" y="-8" className={styles.expressPlace}>{place.venue}</text>}</g>)}
        <g transform={`translate(${scene.end.join(" ")}) scale(${symbolScale})`}><circle r="11" fill="#ead49a" opacity=".65"/><circle r="4" fill="#9c752d"/></g>
      </g>
      <rect width="1000" height={sceneHeight} fill={`url(#${patternId})`} pointerEvents="none"/>
      <g transform={`translate(${scene.screen.join(" ")}) rotate(${rotation}) scale(${direction*520/width} ${520/width})`} className={styles.travelerFigure} data-travel-progress={progress.toFixed(3)}>
        <ellipse cx="-25" cy="4" rx="105" ry="12" fill="#253e35" opacity=".14"/>
        {running && progress < 1 && <g className={styles.expressSpeedLines}><path d="M-160,-38H-230 M-150,-20H-205 M-165,-2H-245" stroke="#9bad92" strokeWidth="3" strokeLinecap="round"/></g>}
        <g className={styles.expressTrain}>
          <path d="M-126,-52 Q-128,-61 -114,-61 H-33 Q-22,-61 -20,-50 V-7 H-126Z" fill="#fffdf5" stroke="#597666" strokeWidth="1.5"/>
          <path d="M-17,-61 H25 Q49,-59 78,-22 L92,-9 Q94,-3 81,-3 H-17Z" fill="#fffdf5" stroke="#597666" strokeWidth="1.5"/>
          <path d="M-126,-24 H-20 V-12 H-126Z M-17,-24 H76 L89,-12 H-17Z" fill="#315b49"/>
          <path d="M-126,-29 H-20 M-17,-29 H71" stroke="#c5a357" strokeWidth="4"/>
          <path d="M29,-53 Q46,-47 59,-34 H23 V-53Z" fill="#315b49"/>
          {[-111,-86,-61,-7].map(x => <rect key={x} x={x} y="-49" width="18" height="15" rx="3" fill="#74958c"/>)}
          <path d="M-124,-7H-20 M-16,-5H79" stroke="#778b7b" strokeWidth="4"/>
          {[-105,-44,4,54].map(x => <circle key={x} cx={x} cy="-4" r="6" fill="#304a3e"/>)}
          <path d="M-21,-45V-12" stroke="#9ba995" strokeWidth="4"/><path d="M76,-15H85" stroke="#e2b755" strokeWidth="4" strokeLinecap="round"/>
        </g>
      </g>
      <g transform={`translate(806 ${sceneHeight-164})`} opacity=".9"><rect x="-12" y="-12" width="180" height="154" rx="7" fill="#fffdf1" stroke="#c8ceb9"/><g transform="scale(.18)"><path d={land} fill="#d3dcc4"/><circle cx={scene.point[0]} cy={scene.point[1]} r="17" fill="#b48b3c"/></g><text y="132" className={styles.expressMiniLabel}>{scene.zoom > 10 ? "地域を移動中" : "日本を移動中"}</text></g>
    </svg>
    <div className={styles.expressSceneLabel}>{scene.zoom > 10 ? "LOCAL JOURNEY" : "JAPAN JOURNEY"}<span>{progress < 1 ? "列車に乗って、次の思い出へ。" : "まもなく到着です。"}</span></div>
    </div>
    <footer role="status"><div className={styles.expressProgress}><i style={{width:`${progress*100}%`}}/></div><strong>{failed ? "街の地図を読み込めませんでした。" : progress < 1 ? running ? "移動中…" : "移動を一時停止しています。" : mapReady ? "到着しました。" : "到着しました。街の地図を準備しています…"}</strong>{failed && <button type="button" onClick={onRetry}>地図を再読み込み</button>}<p>{scene.nearby ? "会場への到着演出です。実際の移動経路は表しません。" : "記録をつなぐ演出です。実際の鉄道路線・交通手段は表しません。"}</p></footer>
  </div>;
}
