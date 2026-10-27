"use client";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ACTIVITY_KINDS, type ActivityRecord } from "@/lib/activity";
import { buildTowers, clusterTowers, MAP_COLORS, projectPlace, replaySteps, resolvePlace, validCoordinates, venueKey, type ActivityPlace, type MemoryTower } from "@/lib/activity-map";
import outline from "@/data/japan-outline.json";
import base from "@/components/plans/plans.module.css";
import styles from "./map.module.css";

const land = outline.map(ring => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${projectPlace(lon, lat).map(n => n.toFixed(2)).join(",")}`).join("") + "Z").join("");
const labels = [{ name: "北海道", lon: 143, lat: 43.4 }, { name: "東北", lon: 141.2, lat: 39 }, { name: "関東", lon: 141, lat: 35.7 }, { name: "中部", lon: 137.2, lat: 36.4 }, { name: "関西", lon: 134.5, lat: 35.6 }, { name: "中国", lon: 132.5, lat: 35.3 }, { name: "四国", lon: 134, lat: 32.7 }, { name: "九州", lon: 129.3, lat: 32.4 }, { name: "沖縄", lon: 128.7, lat: 26.2 }];
const fullView = { zoom: 1, x: 480, y: 310 };
export function ActivityMap() {
  const [records, setRecords] = useState<ActivityRecord[]>([]), [places, setPlaces] = useState<ActivityPlace[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const [year, setYear] = useState(""), [kind, setKind] = useState("");
  const [step, setStep] = useState<number | null>(null), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1200);
  const [view, setView] = useState(fullView), [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const mapElement = useRef<SVGSVGElement>(null);
  const [mapWidth, setMapWidth] = useState(960);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const gradientId = useId().replace(/:/g, "");
  useEffect(() => {
    const element = mapElement.current; if (!element) return;
    const observer = new ResizeObserver(entries => { const width = entries[0]?.contentRect.width; if (width) setMapWidth(width); });
    observer.observe(element); return () => observer.disconnect();
  }, [loading]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["/api/activity", "/api/activity/places"].map(async url => {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "地図を読み込めませんでした。"); return data;
    })).then(([rows, locations]) => { if (!controller.signal.aborted) { setRecords(rows); setPlaces(locations); setError(""); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const filtered = useMemo(() => records.filter(r => (!year || r.date.startsWith(`${year}-`)) && (!kind || kind === r.kind)), [records, year, kind]);
  const mapped = useMemo(() => filtered.filter(r => resolvePlace(r, places)), [filtered, places]);
  const steps = useMemo(() => replaySteps(mapped), [mapped]);
  const progress = step === null ? steps.length : Math.min(step, steps.length);
  const visible = step === null ? mapped : steps.slice(0, progress).flatMap(s => s.records);
  const towers = buildTowers(visible, places), allTowers = buildTowers(mapped, places);
  const clusters = clusterTowers(towers, view.zoom * mapWidth / 960);
  const maxCount = Math.max(1, ...clusterTowers(allTowers, view.zoom * mapWidth / 960).map(c => c.towers.reduce((n, t) => n + t.records.length, 0)));
  const layerHeight = Math.min(13, 125 / maxCount);
  const latest = step !== null && progress > 0 ? steps[progress - 1] : null;
  const focusTowers = allTowers.filter(t => selected.includes(t.key));
  const years = [...new Set(records.map(r => r.date.slice(0, 4)))].sort().reverse();
  const venues = [...new Map(filtered.map(r => [venueKey(r.venue, r.city), r])).values()];
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => { if (progress >= steps.length) setPlaying(false); else setStep(progress + 1); }, speed);
    return () => window.clearTimeout(timer);
  }, [playing, progress, speed, steps.length]);
  function changeFilter(nextYear: string, nextKind: string) { setYear(nextYear); setKind(nextKind); setPlaying(false); setStep(null); setSelected([]); setEditing(null); }
  function zoom(factor: number, x = view.x, y = view.y) { setView({ zoom: Math.max(1, Math.min(64, view.zoom * factor)), x, y }); }
  function selectTower(group: MemoryTower[], x: number, y: number) {
    if (drag.current?.moved) return;
    setSelected(group.map(t => t.key));
    if (group.length > 1) zoom(4, x, y);
  }
  if (loading) return <p role="status">思い出の地図を広げています…</p>;
  if (error) return <div className={base.empty} role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>もう一度読み込む</button><Link href="/activity">行動記録へ戻る</Link></div>;
  return <>
    <div className={base.topActions}><Link href="/activity">← お出かけ手帳</Link><Link className={base.primary} href="/activity/new">＋ 行った記録を残す</Link></div>
    <section className={styles.atlas} aria-labelledby="memory-map-title">
      <header className={styles.heading}><div><p className={base.eyebrow}>MY MEMORY ATLAS / JAPAN</p><h2 id="memory-map-title">通うほど、思い出は高く。</h2><p>記録1件が、塔の1段。好きに会いに行った回数を、積み重ねよう。</p></div><div className={styles.totals}><strong>{visible.length}<span>回のお出かけ</span></strong><strong>{towers.length}<span>会場の塔</span></strong></div></header>
      <div className={styles.filters}><label>年<select aria-label="地図の年" value={year} onChange={e => changeFilter(e.target.value, kind)}><option value="">すべての年</option>{years.map(y => <option key={y} value={y}>{y}年</option>)}</select></label><label>種類<select aria-label="地図の種類" value={kind} onChange={e => changeFilter(year, e.target.value)}><option value="">すべて</option>{Object.entries(ACTIVITY_KINDS).map(([k, name]) => <option key={k} value={k}>{name}</option>)}</select></label><span>{mapped.length} / {filtered.length}件を地図に表示</span></div>
      <div className={styles.canvas}>
        <div className={styles.mapButtons} role="group" aria-label="地図を操作"><button type="button" aria-label="拡大" onClick={() => zoom(2)}>＋</button><button type="button" aria-label="縮小" disabled={view.zoom === 1} onClick={() => zoom(.5)}>−</button><button type="button" onClick={() => setView(fullView)}>日本全体</button></div>
        <svg ref={mapElement} className={styles.map} viewBox={`${view.x - 480 / view.zoom} ${view.y - 310 / view.zoom} ${960 / view.zoom} ${620 / view.zoom}`} role="group" aria-label="訪れた回数が積み上がる日本地図" onPointerDown={e => { if ((e.target as Element).closest('[role="button"]')) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, cx: view.x, cy: view.y, moved: false }; }} onPointerMove={e => { const d = drag.current; if (!d) return; const scale = 960 / view.zoom / e.currentTarget.getBoundingClientRect().width; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) { d.moved = true; setView(v => ({ ...v, x: d.cx - dx * scale, y: d.cy - dy * scale })); } }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0.7" y2="1"><stop stopColor="#ebe5d1"/><stop offset="1" stopColor="#d7d7bf"/></linearGradient></defs>
          <path d={land} transform="translate(0 7)" fill="#b4b9a2" opacity=".55"/>
          <path d={land} fill={`url(#${gradientId})`} stroke="#faf7ed" strokeWidth={.9} vectorEffect="non-scaling-stroke"/>
          {view.zoom === 1 && labels.map(l => { const [x, y] = projectPlace(l.lon, l.lat); return <text key={l.name} x={x} y={y} className={styles.region}>{l.name}</text>; })}
          {clusters.map(c => {
            const entries = c.towers.flatMap(t => t.records).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
            const n = entries.length, h = layerHeight * n, grouped = c.towers.length > 1;
            const active = latest?.records.some(r => c.towers.some(t => t.key === venueKey(r.venue, r.city)));
            // Draw at most 60 colour bands; count stays exact for large collections.
            const bands = Math.min(60, n);
            return <g key={c.towers.map(t => t.key).sort().join("|")} transform={`translate(${c.x} ${c.y}) scale(${960 / mapWidth / view.zoom})`} className={`${styles.tower} ${active ? styles.active : ""}`} role="button" tabIndex={0} aria-label={`${grouped ? `${c.towers.length}会場のまとまり` : c.towers[0].venue}、${n}回${grouped ? '、拡大する' : '、記録を見る'}`} onClick={() => selectTower(c.towers, c.x, c.y)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTower(c.towers, c.x, c.y); } }}>
              <title>{c.towers.map(t => `${t.venue} ${t.records.length}回`).join(" / ")}</title>
              <ellipse cx="5" cy="4" rx="21" ry="8" fill="#314937" opacity=".15"/>
              <circle r="22" fill="transparent"/>
              {Array.from({ length: bands }, (_, i) => { const y = -h * i / bands, height = h / bands, entry = entries[Math.floor(i * n / bands)]; return <g key={i} className={styles.block}><path d={`M-12,${y} L5,${y + 5} L5,${y + 5 - height} L-12,${y - height}Z`} fill={MAP_COLORS[entry.kind]}/><path d={`M5,${y + 5} L17,${y - 1} L17,${y - 1 - height} L5,${y + 5 - height}Z`} fill={MAP_COLORS[entry.kind]} filter="brightness(.78)"/><path d={`M-12,${y - height} L0,${y - height - 6} L17,${y - height - 1} L5,${y - height + 5}Z`} fill={MAP_COLORS[entry.kind]} stroke="#fff8e6" strokeWidth=".4"/></g>; })}
              <rect x="-20" y={-h - 32} width="46" height="22" rx="11" fill="#fffdf5" stroke="#c7b77f"/>
              <text x="3" y={-h - 17} textAnchor="middle" className={styles.count}>{n}回</text>
              {grouped && <text x="3" y="24" textAnchor="middle" className={styles.clusterLabel}>{c.towers.length}会場 ＋</text>}
            </g>;
          })}
        </svg>
        {view.zoom === 1 && <div className={styles.mapCaption}>YOUR DAYS,<br/><em>built into places.</em><span>好きだった一日を、ひとつずつ。</span></div>}
        {view.zoom > 1 && <div className={styles.panButtons} role="group" aria-label="表示位置を動かす">{[{ label: "左へ", dx: -1, dy: 0, text: "←" }, { label: "上へ", dx: 0, dy: -1, text: "↑" }, { label: "下へ", dx: 0, dy: 1, text: "↓" }, { label: "右へ", dx: 1, dy: 0, text: "→" }].map(b => <button type="button" key={b.label} aria-label={b.label} onClick={() => setView(v => ({ ...v, x: v.x + b.dx * 140 / v.zoom, y: v.y + b.dy * 140 / v.zoom }))}>{b.text}</button>)}</div>}
      </div>
      <div className={styles.legend}>{Object.entries(ACTIVITY_KINDS).map(([k, name]) => <span key={k}><i style={{ background: MAP_COLORS[k as keyof typeof MAP_COLORS] }}/>{name}</span>)}</div>
      <div className={styles.player}><div className={styles.playActions}><button className={styles.play} type="button" disabled={!steps.length} onClick={() => { if (!playing && (step === null || progress >= steps.length)) setStep(0); setPlaying(!playing); }}>{playing ? "Ⅱ 一時停止" : "▶ 思い出を再生"}</button><button type="button" onClick={() => { setPlaying(false); setStep(null); }}>すべて表示</button><label>速さ<select aria-label="再生の速さ" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={2000}>ゆっくり</option><option value={1200}>ふつう</option><option value={500}>はやい</option></select></label></div><label className={styles.timeline}>思い出をたどる<input aria-label="再生位置" type="range" min="0" max={steps.length || 1} value={progress} disabled={!steps.length} onChange={e => { setPlaying(false); setStep(Number(e.target.value)); }}/><span>{progress} / {steps.length}日</span></label><div className={styles.now} role="status">{latest ? <><strong>{latest.date.replaceAll("-", ".")}</strong><span>{latest.records.map(r => `${r.title} / ${r.venue}`).join(" ・ ")}</span></> : <span>{progress === 0 && step !== null ? "最初の思い出から。" : "塔を押すと、その場所の記録が開きます。近い会場のまとまりは、押して拡大できます。"}</span>}</div></div>
      <p className={styles.note}>日付ごとに積み上がります。同じ日の訪問順や、実際の移動経路は表しません。近い会場はまとめて表示。多い塔は高さと色の段を縮尺調整し、回数はそのまま表示します。</p>
    </section>
    {filtered.length === 0 && <div className={base.empty}><p>この条件の行動記録はまだありません。</p><Link href="/activity/new">最初の思い出を残す ↗</Link></div>}
    {focusTowers.length > 0 && <section className={styles.details} aria-label="選んだ場所の記録"><div className={styles.sectionTitle}><h2>この場所で出会ったもの</h2><button type="button" onClick={() => setSelected([])}>閉じる</button></div>{focusTowers.map(t => <div key={t.key}><h3>{t.venue} <span>{t.records.length}回</span></h3>{[...t.records].sort((a, b) => b.date.localeCompare(a.date)).map(r => <Link key={r.id} href={`/activity/${r.id}/edit`} className={styles.memory}><time>{r.date} {r.time?.slice(0, 5)}</time><span>{r.title}</span><small>{ACTIVITY_KINDS[r.kind]} ↗</small></Link>)}</div>)}</section>}
    <section className={styles.venues} aria-labelledby="venue-list-title"><div className={styles.sectionTitle}><div><p className={base.eyebrow}>PLACES YOU KEEP RETURNING TO</p><h2 id="venue-list-title">あなたの会場コレクション</h2></div><span>{venues.length}会場名</span></div><p>同じ会場名・エリアは、同じ塔に積み上がります。位置未設定の記録は、場所を確認すると地図に加わります。</p><div className={styles.venueGrid}>{venues.sort((a, b) => filtered.filter(r => venueKey(r.venue, r.city) === venueKey(b.venue, b.city)).length - filtered.filter(r => venueKey(r.venue, r.city) === venueKey(a.venue, a.city)).length).map(r => {
      const key = venueKey(r.venue, r.city), location = resolvePlace(r, places), count = filtered.filter(row => venueKey(row.venue, row.city) === key).length;
      return <article className={styles.venueCard} key={key}><div><small>{r.city || "エリア未記入"}</small><h3>{r.venue}</h3><p>{location ? "地図に表示中" : "位置を設定すると地図に加わります"}</p></div><strong>{count}<span>回</span></strong><div className={styles.venueActions}>{location && <button type="button" onClick={() => { setPlaying(false); setStep(null); setSelected([key]); const [x, y] = projectPlace(location.longitude, location.latitude); setView({ zoom: 32, x, y }); }}>地図で見る</button>}<button type="button" onClick={() => { setPlaying(false); setEditing(editing === key ? null : key); }}>{editing === key ? "設定を閉じる" : location ? "位置を確認・変更" : "会場の位置を設定"}</button></div>{editing === key && <PlaceEditor key={key} record={r} places={places} onSave={p => { setPlaces(old => [...old.filter(v => v.venue_key !== key), p]); setStep(null); setEditing(null); }} onRemove={() => { setPlaces(old => old.filter(v => v.venue_key !== key)); setStep(null); setEditing(null); }}/>}</article>;
    })}</div></section>
    <p className={styles.attribution}>地図：<a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth（Public Domain）</a>。会場の確認位置を表示する概略図です。位置情報は選択中のお名前ごとに保存します。</p>
  </>;
}

function PlaceEditor({ record, places, onSave, onRemove }: { record: ActivityRecord; places: ActivityPlace[]; onSave: (place: ActivityPlace) => void; onRemove: () => void }) {
  const location = resolvePlace(record, places), saved = places.find(p => p.venue_key === venueKey(record.venue, record.city));
  const [lat, setLat] = useState(location?.latitude.toString() || ""), [lon, setLon] = useState(location?.longitude.toString() || "");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false);
  async function submit(event: FormEvent, remove = false) {
    event.preventDefault(); setError("");
    const latitude = Number(lat), longitude = Number(lon);
    if (!remove && (!lat || !lon || !validCoordinates(latitude, longitude) || !confirmed)) { setError("会場の緯度・経度を入力し、場所の確認にチェックしてください。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/activity/places", { method: remove ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venue: record.venue, city: record.city, latitude: remove ? saved?.latitude : latitude, longitude: remove ? saved?.longitude : longitude }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "位置を保存できませんでした。");
      if (remove) onRemove(); else onSave(data);
    } catch (e) { setError(e instanceof Error ? e.message : "位置を保存できませんでした。"); setBusy(false); }
  }
  return <form className={styles.placeEditor} onSubmit={submit}><fieldset disabled={busy}><legend>この会場を地図に置く</legend><p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.city} ${record.venue}`)}`} target="_blank" rel="noreferrer">Googleマップで会場を探す ↗</a></p><p>会場を長押し（パソコンは右クリック）して表示される緯度・経度を入力してください。会場が合っているか確認してから保存します。</p>{location && "source" in location && <p><a href={location.source} target="_blank" rel="noreferrer">会場のアクセス案内 ↗</a></p>}<div className={styles.coordinates}><label>緯度<input aria-label={`${record.venue}の緯度`} type="number" min="20" max="46" step="any" value={lat} required onChange={e => { setLat(e.target.value); setConfirmed(false); }} placeholder="35.0000"/></label><label>経度<input aria-label={`${record.venue}の経度`} type="number" min="122" max="154" step="any" value={lon} required onChange={e => { setLon(e.target.value); setConfirmed(false); }} placeholder="139.0000"/></label></div><label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>この会場の場所を確認しました</label>{error && <p role="alert" className={base.error}>{error}</p>}<div className={styles.venueActions}><button type="submit">{busy ? "保存しています…" : "この位置で保存"}</button>{saved && <button type="button" onClick={e => { if (window.confirm("自分で設定した位置を解除しますか？ 行動記録は残ります。")) void submit(e, true); }}>位置の設定を解除</button>}</div></fieldset></form>;
}
