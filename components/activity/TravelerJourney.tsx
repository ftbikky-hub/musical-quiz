"use client";
import { useEffect, useRef, useState } from "react";
import outline from "@/data/japan-outline.json";
import { projectPlace, type MemoryTower } from "@/lib/activity-map";
import styles from "./map.module.css";

const land = outline.map(ring => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${projectPlace(lon, lat).join(",")}`).join("") + "Z").join("");
export interface TravelerStop { latitude: number; longitude: number; label: string }
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
  const start = projectPlace(from.longitude, from.latitude), end = projectPlace(to.longitude, to.latitude);
  const eased = progress * progress * (3 - 2 * progress);
  const x = start[0] + (end[0] - start[0]) * eased, y = start[1] + (end[1] - start[1]) * eased;
  const close = Math.hypot(end[0] - start[0], end[1] - start[1]) < 8;
  return <div className={styles.travelerJourney} aria-label="旅人が日本を移動するアニメーション">
    <header><p>THE LITTLE THEATRE TRAVELER</p><h3>{progress < 1 ? "次の思い出に、会いに。" : mapReady ? "この場所で過ごした一日へ。" : "まもなく、会場の街へ。"}</h3><span>{from.label === to.label ? to.label : `${from.label} → ${to.label}`}</span></header>
    <svg viewBox="40 35 830 560" className={styles.travelerJapan} role="img" aria-label={`${from.label}から${to.label}へ旅する演出`}>
      <path d={land} transform="translate(0 5)" fill="#bdc5ac" opacity=".5"/><path d={land} fill="#e0dfc8" stroke="#fffdf1" strokeWidth="1.5"/>
      {places.map(p => { const point = projectPlace(p.longitude, p.latitude); return <circle key={p.key} cx={point[0]} cy={point[1]} r="3" fill="#688471" opacity=".6"/>; })}
      <path d={`M${start[0]},${start[1]} L${end[0]},${end[1]}`} fill="none" stroke="#b59243" strokeWidth="2" strokeDasharray="5 6"/>
      <circle cx={end[0]} cy={end[1]} r="9" fill="#d5b967" opacity=".35"/><circle cx={end[0]} cy={end[1]} r="3" fill="#a57e2e"/>
      <g transform={`translate(${x} ${y}) scale(1.5)`} className={styles.travelerFigure} data-travel-progress={progress.toFixed(3)}>
        <ellipse cx="2" cy="4" rx="16" ry="5" fill="#344e3b" opacity=".2"/>
        <g className={running && progress < 1 ? styles.travelerWalking : ""}>
          <path d="M-7,-20 L-8,0 M4,-20 L10,0" fill="none" stroke="#263f35" strokeWidth="5" strokeLinecap="round"/>
          <path d="M-10,-37 Q0,-43 9,-35 L12,-16 L-13,-16Z" fill="#315b49"/>
          <path d="M-8,-35 L-17,-23 M7,-34 L17,-26" stroke="#315b49" strokeWidth="5" strokeLinecap="round"/>
          <rect x="-19" y="-29" width="10" height="13" rx="3" fill="#bc9848"/>
          <circle cx="-1" cy="-47" r="8" fill="#d9bd8a"/><path d="M-12,-51 Q-3,-66 7,-51Z" fill="#263f35"/><path d="M-14,-50 H12" stroke="#263f35" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-8,-38 Q0,-33 9,-38 L14,-31" fill="none" stroke="#d8b75e" strokeWidth="4"/>
        </g>
      </g>
      {close && <text x={end[0] + 20} y={end[1] - 5} className={styles.travelCity}>同じ地域の、別の思い出へ</text>}
    </svg>
    <footer role="status"><strong>{failed ? "街の地図を読み込めませんでした。" : progress < 1 ? running ? "旅の途中です…" : "旅を一時停止しています。" : mapReady ? "到着しました。" : "到着しました。街の地図を準備しています…"}</strong>{failed && <button type="button" onClick={onRetry}>地図を再読み込み</button>}<p>地域を結ぶ旅の演出です。実際の交通経路を表すものではありません。</p></footer>
  </div>;
}
