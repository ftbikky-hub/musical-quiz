"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { matchesArchiveSearch } from "@/lib/archive-search";
import { lineupCurrentMonth, lineupRange, shiftLineupMonth, type LineupRangeMode, lineupMonths, lineupMonthText, lineupDateText, lineupPeriod, lineupCellLabel, parseLineupFavorites, type LineupPerformance, type LineupSnapshot } from "@/lib/lineup";
import styles from "./lineup.module.css";

const STORAGE_KEY = "shiki-favorites", CHANGE_EVENT = "theatre-lineup-favorites";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(CHANGE_EVENT, callback); };
}
function subscribeMonth(callback: () => void) {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", callback); };
}
function currentMonth() { return lineupCurrentMonth(new Date()); }
function storedFavorites() { try { return window.localStorage.getItem(STORAGE_KEY) ?? "[]"; } catch { return "[]"; } }
const colors: Record<string, string> = { blue: "#476a81", red: "#96535a", teal: "#4c7a71", gold: "#9b782e", brown: "#82604a", green: "#59734d", purple: "#6e5379" };
function tone(p: LineupPerformance) { return { "--lineup-color": colors[p.color] ?? colors.green } as CSSProperties; }

export function LineupPlanner({ snapshot }: { snapshot: LineupSnapshot }) {
  const today = useSyncExternalStore(subscribeMonth, currentMonth, () => snapshot.checked.slice(0, 7));
  const [rangeMode, setRangeMode] = useState<LineupRangeMode>("upcoming");
  const [anchor, setAnchor] = useState("");
  const range = lineupRange(snapshot, today, rangeMode, anchor);
  const months = lineupMonths(range.from, range.through);
  const rangeLabel = `${lineupMonthText(range.from)}〜${lineupMonthText(range.through)}`;
  function changeRange(mode: LineupRangeMode) { setRangeMode(mode); setAnchor(""); setMonth(""); }
  function moveRange(offset: number) { setAnchor(shiftLineupMonth(range.from, offset)); setMonth(""); }
  const [area, setArea] = useState("すべて"), [month, setMonth] = useState(""), [query, setQuery] = useState("");
  const activeMonth = months.includes(month) ? month : "";
  const [view, setView] = useState<"timeline" | "list">("timeline"), [onlyFavorites, setOnlyFavorites] = useState(false);
  const rawFavorites = useSyncExternalStore(subscribe, storedFavorites, () => "[]");
  const [memoryFavorites, setMemoryFavorites] = useState<string[] | null>(null);
  const saved = new Set(memoryFavorites ?? parseLineupFavorites(rawFavorites));
  const [selected, setSelected] = useState<LineupPerformance | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  function toggleFavorite(p: LineupPerformance) {
    const next = new Set(saved); if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); setMemoryFavorites(null); window.dispatchEvent(new Event(CHANGE_EVENT)); }
    catch { setMemoryFavorites([...next]); }
  }
  function star(p: LineupPerformance) {
    return <button type="button" className={`${styles.star} ${saved.has(p.id) ? styles.saved : ""}`} aria-label={`${p.title}（${p.city}）をお気に入り${saved.has(p.id) ? "から削除" : "に追加"}`} aria-pressed={saved.has(p.id)} onClick={() => toggleFavorite(p)}>{saved.has(p.id) ? "★" : "☆"}</button>;
  }
  const areas = ["すべて", ...new Set(snapshot.performances.map((p) => p.area))];
  const list = snapshot.performances.filter((p) => p.from <= range.through && p.through >= range.from && (area === "すべて" || p.area === area)
    && (!activeMonth || (p.from <= activeMonth && p.through >= activeMonth))
    && (!onlyFavorites || saved.has(p.id)) && matchesArchiveSearch(`${p.title} ${p.city} ${p.venue}`, query));
  const featured = snapshot.featuredIds.flatMap((id) => snapshot.performances.filter((p) => p.id === id && p.through >= today));
  function reset() { setArea("すべて"); setMonth(""); setQuery(""); setOnlyFavorites(false); }
  return <div className={styles.planner}>
    {featured.length > 0 && <section aria-label="これからの注目公演" className={styles.featured}>
      <p className={styles.eyebrow}>COMING NEXT <span>これからの楽しみ</span></p>
      <div className={styles.featureGrid}>{featured.map((p) => <button key={p.id} type="button" style={tone(p)} onClick={() => setSelected(p)} className={styles.feature}>
        <span>{p.city} · {lineupPeriod(p)}</span><strong>{p.title}</strong><small>{p.venue}<span aria-hidden="true">↗</span></small>
      </button>)}</div>
    </section>}
    <section aria-labelledby="lineup-title" className={styles.finder}>
      <div className={styles.finderTitle}><div><p className={styles.eyebrow}>FIND YOUR STAGE</p><h2 id="lineup-title">{rangeMode === "past" ? "過去の上演予定をたどる" : "上演予定を見渡す"}</h2><p>{rangeLabel}</p></div>
        <div className={styles.viewToggle} role="group" aria-label="表示形式">{([['timeline', '年間一覧'], ['list', '公演リスト']] as const).map(([id, text]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>{text}</button>)}</div>
      </div>
      <div className={styles.rangePanel}>
        <div className={styles.rangeModes} role="group" aria-label="表示期間">{([['upcoming', '今月から先'], ['past', '過去1年'], ['recorded', '収録期間すべて']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={rangeMode === id} onClick={() => changeRange(id)}>{label}</button>)}</div>
        {rangeMode !== "recorded" && <div className={styles.rangeNavigation}>
          <button type="button" aria-label="表示期間を1か月前へ" onClick={() => moveRange(-1)}>←</button>
          <label>開始月 <input type="month" aria-label="表示の開始月" value={range.from} min="1900-01" max="2199-01" onChange={(event) => { if (/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value)) { setAnchor(event.target.value); setMonth(""); } }}/></label>
          <button type="button" aria-label="表示期間を1か月後へ" onClick={() => moveRange(1)}>→</button>
        </div>}
      </div>
      <p className={styles.coverage}>収録範囲：{lineupMonthText(snapshot.displayFrom)}〜{lineupMonthText(snapshot.displayThrough)}。範囲外は未収録です。{rangeMode === "past" ? "過去の表も、保存された上演予定です。実際の上演実績やご自身の観劇記録とは異なります。" : "今月から先の表示は、日本時間の月替わりに自動で進みます。公演データの自動更新は未実装です。"}</p>
      <div className={styles.filters}>
        <div className={styles.regions} role="group" aria-label="地域">{areas.map((item) => <button type="button" key={item} aria-pressed={area === item} onClick={() => setArea(item)}>{item}</button>)}</div>
        <div className={styles.otherFilters}>
          <label className={styles.search}><span className="sr-only">作品・都市・劇場を検索</span><input type="search" placeholder="作品・都市・劇場を検索" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
          <label><span className="sr-only">上演月</span><select aria-label="上演月" value={activeMonth} onChange={(event) => setMonth(event.target.value)}><option value="">すべての月</option>{months.map((item) => <option key={item} value={item}>{lineupMonthText(item)}</option>)}</select></label>
          <button type="button" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((value) => !value)}>{onlyFavorites ? "★" : "☆"} お気に入りだけ</button>
        </div>
      </div>
      <div className={styles.meta}><p role="status">{list.length}公演{onlyFavorites ? " · お気に入り" : ""}</p><p className={styles.legend}><i/>上演予定 <i className={styles.planned}/>月のみ発表 <span>…</span>終演日未発表</p></div>
      {memoryFavorites !== null && <p className={styles.warning} role="status">端末に保存できないため、お気に入りはこの画面を開いている間だけ保持されます。</p>}
      {list.length === 0 ? <div className={styles.empty}><p>{range.through < snapshot.displayFrom || range.from > snapshot.displayThrough ? "この期間の上演予定はまだ収録されていません。" : "該当する公演がありません。"}</p>{(range.through < snapshot.displayFrom || range.from > snapshot.displayThrough) && <button type="button" onClick={() => changeRange("recorded")}>収録期間を見る</button>}<button type="button" onClick={reset}>条件をリセット</button></div>
        : view === "list" ? <div className={styles.listGrid}>{list.map((p) => <article key={p.id} style={tone(p)} className={styles.listCard}>
          <div className={styles.city}>{p.city} · {p.area}{star(p)}</div><h3><button type="button" onClick={() => setSelected(p)}>{p.title}</button></h3><p>{p.venue}</p><p className={styles.period}>{lineupPeriod(p)}</p><p>{p.note}</p>
        </article>)}</div>
        : <><p className={styles.scrollHint}>表は横にスクロールできます。作品名は左に固定されます。</p>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="作品と月の年間上演予定表" aria-describedby="lineup-reading-note">
            <table className={styles.timeline}><caption className="sr-only">{rangeLabel}の上演予定。月の帯は表示上の目安です。</caption>
              <thead><tr><th scope="col">作品 / 都市・劇場</th>{months.map((item) => <th scope="col" key={item} aria-current={item === today ? "date" : undefined}><small>{item.slice(0, 4)}</small>{Number(item.slice(5))}月</th>)}</tr></thead>
              <tbody>{areas.slice(1).map((group) => {
                const groupList = list.filter((p) => p.area === group); if (!groupList.length) return null;
                return <GroupRows key={group} group={group} list={groupList} months={months} star={star} select={setSelected}/>;
              })}</tbody>
            </table>
          </div></>}
      <div className={styles.notes} id="lineup-reading-note"><strong>この表の読み方</strong><p>帯は上演予定期間の目安です。各月のすべての日に公演があるとは限りません。斜線は日付未発表の予定、「…」は終演日未発表を示します。空欄は、この一覧で確認できない期間です。帯の末尾が千秋楽とは限りません。</p></div>
    </section>
    <section className={styles.source} aria-label="データの出典"><div><strong>公式情報から整理したスナップショット</strong><p>元データ確認日：{lineupDateText(snapshot.checked)} · 自動更新は未実装</p><p>お気に入りはこのブラウザに保存されます。試作サイトの登録は自動移行されません。</p></div><div className={styles.sourceLinks}><a href={snapshot.source} target="_blank" rel="noopener noreferrer">最新情報を公式で確認 ↗</a><Link href="/lineup/notifications">公式の変更をGmailで受け取る設定 ↗</Link></div></section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="lineup-detail-title" onClose={() => setSelected(null)} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
    }}>
      <button type="button" className={styles.close} aria-label="閉じる" onClick={() => dialog.current?.close()}>×</button>
      {selected && <><p className={styles.eyebrow}>{selected.city} · {selected.area}</p><h2 id="lineup-detail-title">{selected.title}</h2><p>{selected.venue}</p><p className={styles.detailPeriod}>{lineupPeriod(selected)}</p><p>{selected.note}</p>{star(selected)}<p className={styles.notes}>上演期間の目安です。公演日・開演時刻・チケット発売状況は公式でご確認ください。全国公演には一般販売の対象でない公演が含まれる場合があります。</p><a href={snapshot.source} target="_blank" rel="noopener noreferrer">公式の上演ラインアップを確認 ↗</a></>}
    </dialog>
  </div>;
}

function GroupRows({ group, list, months, star, select }: { group: string; list: LineupPerformance[]; months: string[]; star: (p: LineupPerformance) => React.ReactNode; select: (p: LineupPerformance) => void }) {
  return <><tr className={styles.group}><th colSpan={months.length + 1} scope="rowgroup">{group}</th></tr>{list.map((p) => <tr key={p.id} className={styles.work}>
    <th scope="row"><div className={styles.workName}>{star(p)}<div><button type="button" className={styles.titleButton} onClick={() => select(p)}>{p.title}</button><small>{p.city} · {p.venue}</small></div></div></th>
    {months.map((month) => <td key={month}>{p.from <= month && p.through >= month && <button type="button" style={tone(p)} onClick={() => select(p)}
      className={[styles.bar, month === p.from ? styles.first : "", month === p.through ? styles.last : "", p.monthly ? styles.planned : "", month === p.through && !p.end && (p.open || !p.monthly) ? styles.ongoing : ""].join(" ")}
      aria-label={`${p.title}（${p.city}） ${lineupMonthText(month)}の表示範囲。${lineupPeriod(p)}`} title={p.note}>{lineupCellLabel(p, month)}</button>}</td>)}
  </tr>)}</>;
}
