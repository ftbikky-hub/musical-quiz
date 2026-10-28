"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ACTIVITY_KINDS, type ActivityRecord } from "@/lib/activity";
import { buildTowers, MAP_COLORS, MEMORY_REGIONS, towersInRegion, towerFloorHeight, replaySteps, resolvePlace, validCoordinates, venueKey, type ActivityPlace } from "@/lib/activity-map";
import type { MemoryMapReadiness } from "@/lib/activity-map-readiness";
import { StreetMemoryMap, type MemoryMapFocus } from "./StreetMemoryMap";
import { MemoryDestination, ZoomMemoryMap } from "./ZoomMemoryMap";
import base from "@/components/plans/plans.module.css";
import styles from "./map.module.css";

export function ActivityMap() {
  const [records, setRecords] = useState<ActivityRecord[]>([]), [places, setPlaces] = useState<ActivityPlace[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const [year, setYear] = useState(""), [kind, setKind] = useState("");
  const [step, setStep] = useState<number | null>(null), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1800);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"overview" | "detail">("overview"), [follow, setFollow] = useState(true);
  const [mapReadiness, setMapReadiness] = useState<MemoryMapReadiness>({ id: "initial", status: "loading" });
  const [replayRun, setReplayRun] = useState(0);
  const [focusRequest, setFocusRequest] = useState<MemoryMapFocus | null>(null);
  const focusCounter = useRef(0);
  const [editing, setEditing] = useState<string | null>(null);
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
  const layerHeight = towerFloorHeight(allTowers);
  const stopFloorHeight = Math.min(layerHeight, 100 / Math.max(1, ...allTowers.map(t => t.records.length)));
  const latest = step !== null && progress > 0 ? steps[progress - 1] : null;
  const activeTowers = towers.filter(t => latest?.records.some(r => venueKey(r.venue, r.city) === t.key));
  const journeyKey = `journey:${replayRun}:${progress}`;
  const initialVenue = towersInRegion(allTowers, "tokyo")[0] || allTowers[0];
  const currentFocus: MemoryMapFocus | null = mode === "overview" ? { id: "national", keys: [], national: true } : focusRequest || (initialVenue ? { id: "initial-venue", keys: [initialVenue.key], maxZoom: 14.5, minZoom: 14 } : null);
  const focusTowers = allTowers.filter(t => selected.includes(t.key));
  const years = [...new Set(records.map(r => r.date.slice(0, 4)))].sort().reverse();
  const venues = [...new Map(filtered.map(r => [venueKey(r.venue, r.city), r])).values()];
  useEffect(() => {
    if (!playing || progress > 0) return;
    const timer = window.setTimeout(() => setStep(1), 100);
    return () => window.clearTimeout(timer);
  }, [playing, progress]);
  function finishDay() {
    if (!playing) return;
    if (progress >= steps.length) setPlaying(false);
    else setStep(progress + 1);
  }
  function changeFilter(nextYear: string, nextKind: string) { setYear(nextYear); setKind(nextKind); setPlaying(false); setStep(null); setSelected([]); setEditing(null); }
  function openDetail(keys: string[], maxZoom = 16) {
    setPlaying(false); setStep(null); setMode("detail");
    setFocusRequest({ id: `manual:${++focusCounter.current}`, keys, maxZoom });
  }
  if (loading) return <p role="status">思い出の地図を広げています…</p>;
  if (error) return <div className={base.empty} role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>もう一度読み込む</button><Link href="/activity">行動記録へ戻る</Link></div>;
  return <>
    <div className={base.topActions}><Link href="/activity">← お出かけ手帳</Link><Link className={base.primary} href="/activity/new">＋ 行った記録を残す</Link></div>
    <section className={styles.atlas} aria-labelledby="memory-map-title">
      <header className={styles.heading}><div><p className={base.eyebrow}>MY MEMORY ATLAS / JAPAN</p><h2 id="memory-map-title">通うほど、思い出は高く。</h2><p>記録1件が、塔の1段。好きに会いに行った回数を、積み重ねよう。</p></div><div className={styles.totals}><strong>{visible.length}<span>回のお出かけ</span></strong><strong>{towers.length}<span>会場の塔</span></strong></div></header>
      <div className={styles.filters}><label>年<select aria-label="地図の年" value={year} onChange={e => changeFilter(e.target.value, kind)}><option value="">すべての年</option>{years.map(y => <option key={y} value={y}>{y}年</option>)}</select></label><label>種類<select aria-label="地図の種類" value={kind} onChange={e => changeFilter(year, e.target.value)}><option value="">すべて</option>{Object.entries(ACTIVITY_KINDS).map(([k, name]) => <option key={k} value={k}>{name}</option>)}</select></label><span>{mapped.length} / {filtered.length}件を地図に表示</span></div>
      <div className={styles.exploreBar} role="group" aria-label="表示する地域"><button type="button" aria-pressed={mode === "overview"} onClick={() => { setPlaying(false); setStep(null); setMode("overview"); }}>日本全体</button>{MEMORY_REGIONS.map(region => { const points = towersInRegion(allTowers, region.id); return <button type="button" key={region.id} disabled={!points.length} onClick={() => openDetail(points.map(t => t.key), region.id === "takeshiba" ? 18 : 14)}>{region.name}を拡大</button>; })}<button type="button" disabled={!allTowers.length} onClick={() => openDetail(allTowers.map(t => t.key), 14)}>訪れた場所を全部</button></div>
      <p className={styles.exploreHelp}>全国から目的地へズームし、会場の塔が育ったら、ふたたび日本全体へ。作品名とともに、好きに会いに行った日をたどります。</p>
      {step !== null ? <ZoomMemoryMap key={journeyKey} towers={towers} allTowers={allTowers} day={latest} running={playing} speed={speed} follow={follow} onComplete={finishDay} onSelect={setSelected}/> : <div className={styles.zoomViewport}><StreetMemoryMap towers={towers} allTowers={allTowers} activeKeys={selected} focus={currentFocus} onSelect={setSelected} onReadiness={setMapReadiness} readiness={mapReadiness}/>{mode === "overview" && steps.length > 0 && <MemoryDestination day={steps[0]}/>}</div>}
      {latest && <div className={styles.journeyStops} aria-label="この日の会場と訪問回数">{activeTowers.map(t => <article key={t.key}><div className={styles.stopTower} aria-hidden="true" style={{ height: `${t.records.length * stopFloorHeight}px` }}>{Array.from({ length: Math.min(30, t.records.length) }, (_, i) => <i key={i} style={{ background: MAP_COLORS[t.records[Math.floor(i * t.records.length / Math.min(30, t.records.length))].kind] }}/>)}</div><div><small>{latest.date} · {t.city}</small><h3>{t.venue}</h3><strong>この日まで {t.records.length}回</strong><button type="button" onClick={() => { setSelected([t.key]); openDetail([t.key], 17); }}>会場を詳しく見る ↗</button></div></article>)}</div>}
      <div className={styles.legend}>{Object.entries(ACTIVITY_KINDS).map(([k, name]) => <span key={k}><i style={{ background: MAP_COLORS[k as keyof typeof MAP_COLORS] }}/>{name}</span>)}</div>
      <div className={styles.player}><div className={styles.playActions}><button className={styles.play} type="button" disabled={!steps.length} onClick={() => { if (!playing) { setMode("detail"); if (step === null || progress >= steps.length) { setReplayRun(n => n + 1); setStep(0); } } setPlaying(!playing); }}>{playing ? "Ⅱ 一時停止" : "▶ 思い出を再生"}</button><button type="button" onClick={() => { setPlaying(false); setStep(null); }}>すべて表示</button><label>速さ<select aria-label="再生の速さ" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={3500}>ゆっくり</option><option value={1800}>ふつう</option><option value={900}>はやい</option></select></label><label className={styles.follow}><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)}/>目的地へズームする</label></div><label className={styles.timeline}>思い出をたどる<input aria-label="再生位置" type="range" min="0" max={steps.length || 1} value={progress} disabled={!steps.length} onChange={e => { setPlaying(false); setMode("detail"); setStep(Number(e.target.value)); }}/><span>{progress} / {steps.length}日</span></label><div className={styles.now} role="status">{latest ? <><strong>{latest.date.replaceAll("-", ".")}</strong><span>{latest.records.map(r => `${r.title} / ${r.venue}`).join(" ・ ")}</span></> : <span>{progress === 0 && step !== null ? "最初の思い出から。" : "塔を押すと、その場所の記録が開きます。近い会場のまとまりは、押して拡大できます。"}</span>}</div></div>
      <p className={styles.note}>日付ごとに積み上がり、全国に戻ってから次の目的地へ進みます。速度は到着後に眺める時間です。再生中も道路・地名のある地図を表示します。細かい地図の準備中は直前の地図を残し、到着時に読み込みが終わるまで待機します。同じ日の複数会場はまとめて表示し、訪問順や実際の移動経路は表しません。近い会場はまとめて表示。詳細地図では会場ごとに塔を分け、同じ高さの基準で回数を比較できます。近すぎる塔は実際の会場位置へ線を結んで離して表示します。</p>
    </section>
    {filtered.length === 0 && <div className={base.empty}><p>この条件の行動記録はまだありません。</p><Link href="/activity/new">最初の思い出を残す ↗</Link></div>}
    {focusTowers.length > 0 && <section className={styles.details} aria-label="選んだ場所の記録"><div className={styles.sectionTitle}><h2>この場所で出会ったもの</h2><button type="button" onClick={() => setSelected([])}>閉じる</button></div>{focusTowers.map(t => <div key={t.key}><h3>{t.venue} <span>{t.records.length}回</span></h3>{[...t.records].sort((a, b) => b.date.localeCompare(a.date)).map(r => <Link key={r.id} href={`/activity/${r.id}/edit`} className={styles.memory}><time>{r.date} {r.time?.slice(0, 5)}</time><span>{r.title}</span><small>{ACTIVITY_KINDS[r.kind]} ↗</small></Link>)}</div>)}</section>}
    <section className={styles.venues} aria-labelledby="venue-list-title"><div className={styles.sectionTitle}><div><p className={base.eyebrow}>PLACES YOU KEEP RETURNING TO</p><h2 id="venue-list-title">あなたの会場コレクション</h2></div><span>{venues.length}会場名</span></div><p>同じ会場名・エリアは、同じ塔に積み上がります。位置未設定の記録は、場所を確認すると地図に加わります。</p><div className={styles.venueGrid}>{venues.sort((a, b) => filtered.filter(r => venueKey(r.venue, r.city) === venueKey(b.venue, b.city)).length - filtered.filter(r => venueKey(r.venue, r.city) === venueKey(a.venue, a.city)).length).map(r => {
      const key = venueKey(r.venue, r.city), location = resolvePlace(r, places), count = filtered.filter(row => venueKey(row.venue, row.city) === key).length;
      return <article className={styles.venueCard} key={key}><div><small>{r.city || "エリア未記入"}</small><h3>{r.venue}</h3><p>{location ? "地図に表示中" : "位置を設定すると地図に加わります"}</p></div><strong>{count}<span>回</span></strong><div className={styles.venueActions}>{location && <button type="button" onClick={() => { setSelected([key]); openDetail([key], 17); }}>地図で見る</button>}<button type="button" onClick={() => { setPlaying(false); setEditing(editing === key ? null : key); }}>{editing === key ? "設定を閉じる" : location ? "位置を確認・変更" : "会場の位置を設定"}</button></div>{editing === key && <PlaceEditor key={key} record={r} places={places} onSave={p => { setPlaces(old => [...old.filter(v => v.venue_key !== key), p]); setStep(null); setEditing(null); }} onRemove={() => { setPlaces(old => old.filter(v => v.venue_key !== key)); setStep(null); setEditing(null); }}/>}</article>;
    })}</div></section>
    <p className={styles.attribution}>地図：<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>。会場の位置情報は選択中のお名前ごとに保存します。</p>
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
