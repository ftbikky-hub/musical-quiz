"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PLAN_KINDS, PLAN_STATUSES, agendaEntries, japanDate, planDateLabel, googleCalendarUrl, planIcs, type PersonalPlan, type PlanKind, type AgendaEntry } from "@/lib/plans";
import { CalendarImport } from "./CalendarImport";
import styles from "./plans.module.css";
function subscribeToday(callback: () => void) { const timer = setInterval(callback, 60_000); window.addEventListener("focus", callback); return () => { clearInterval(timer); window.removeEventListener("focus", callback); }; }
function currentDay() { return japanDate(new Date()); }
export function downloadPlans(entries: AgendaEntry[]) {
  const url = URL.createObjectURL(new Blob([planIcs(entries)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "theatre-notes.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PlansDashboard({ today: serverToday }: { today: string }) {
  const today = useSyncExternalStore(subscribeToday, currentDay, () => serverToday);
  const [plans, setPlans] = useState<PersonalPlan[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [filter, setFilter] = useState<PlanKind | "all">("all"), [query, setQuery] = useState(""), [past, setPast] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/plans", { cache: "no-store", signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "予定を読み込めませんでした。"); if (!controller.signal.aborted) { setPlans(data); setError(""); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message || "予定を読み込めませんでした。"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  function reload() { setLoading(true); setError(""); setRefresh(n => n + 1); }
  const upcoming = agendaEntries(plans, today);
  const next = upcoming.find(e => !e.milestone && ["theatre", "concert"].includes(e.kind));
  const reminders = upcoming.filter(e => ["deadline", "result"].includes(e.kind)).slice(0, 4);
  const list = agendaEntries(plans, today, past).filter(e => (filter === "all" || e.kind === filter) && `${e.plan.title} ${e.plan.venue} ${e.plan.memo}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").trim().toLowerCase()));
  const groups = [...new Set(list.map(e => e.date.slice(0, 7)))];
  return <>
    <div className={styles.topActions}><Link href="/plans/new" className={styles.primary}>＋ 予定を追加する</Link><a href="#calendar-import">Googleカレンダーから取り込む ↓</a><Link href="/theater-log">観劇の思い出を見る ↗</Link></div>
    {loading ? <p role="status" className={styles.notice}>予定を読み込んでいます…</p> : error ? <div className={styles.empty} role="alert"><h2>予定を読み込めませんでした。</h2><p>{error}</p><button type="button" onClick={reload}>もう一度読み込む</button>{error.includes("テーブル") && <p>サイト管理者向け：<a href="/downloads/personal-plans-setup.sql" download>初回設定用SQL</a></p>}</div>
      : <>
        <section className={styles.highlights} aria-label="これからのお楽しみと締め切り"><div className={styles.nextCard}><p className={styles.eyebrow}>YOUR NEXT APPLAUSE</p><span className={styles.nextLabel}>次のお楽しみ</span>{next ? <><h2>{next.plan.title}</h2><p>{next.date.slice(0, 4)}年 {planDateLabel(next.date)} · {next.time || "時刻未登録"}</p><p>{next.plan.venue || "会場未登録"}</p><Link href={`/plans/${next.plan.id}/edit`}>予定を確かめる ↗</Link></> : <><h2>次の一幕を、楽しみに。</h2><p>観たい舞台やコンサートを、手帳に加えましょう。</p></>}</div>
          <div className={styles.reminders}><p className={styles.eyebrow}>DON’T MISS THE MOMENT</p><h2>忘れたくない日</h2>{reminders.length ? reminders.map(e => <Link key={e.id} href={`/plans/${e.plan.id}/edit`}><span>{planDateLabel(e.date)}<small>{e.time || "時刻未登録"}</small></span><div><small>{PLAN_KINDS[e.kind]}</small><strong>{e.plan.title}</strong></div><span aria-hidden="true">↗</span></Link>) : <p>抽選締め切りや当落発表を登録すると、ここに並びます。</p>}</div></section>
        <section className={styles.agenda} aria-labelledby="agenda-title"><div className={styles.agendaHeading}><div><p className={styles.eyebrow}>MY PERSONAL PROGRAMME</p><h2 id="agenda-title">{past ? "これまでと、終了した予定" : "この先の予定"}</h2></div><div className={styles.segment} role="group" aria-label="予定の期間"><button type="button" aria-pressed={!past} onClick={() => setPast(false)}>これから</button><button type="button" aria-pressed={past} onClick={() => setPast(true)}>過去・終了</button></div></div>
          <div className={styles.filters}><div className={styles.segment} role="group" aria-label="予定の種類"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>すべて</button>{Object.entries(PLAN_KINDS).map(([id, name]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id as PlanKind)}>{name}</button>)}</div><label><span className="sr-only">予定を検索</span><input type="search" aria-label="予定を検索" placeholder="作品・会場・メモで探す" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
          <p className={styles.count} role="status">{list.length}件の日付 · 日本時間</p>
          {list.length === 0 && <div className={styles.empty}><h3>{plans.length ? "この条件の予定はありません。" : "楽しみな予定を、最初の一枚に。"}</h3><p>手入力でも、Googleカレンダーからの取り込みでも登録できます。</p><Link href="/plans/new">予定を追加する ↗</Link></div>}
          {groups.map(month => <section className={styles.month} key={month} aria-label={`${month.slice(0, 4)}年${Number(month.slice(5))}月`}><h3>{month.slice(0, 4)} <span>{Number(month.slice(5))}月</span></h3><div>{list.filter(e => e.date.startsWith(month)).map(e => <article key={e.id} className={`${styles.event} ${styles[e.kind]}`}>
            <div className={styles.date}><strong>{Number(e.date.slice(8))}</strong><span>{planDateLabel(e.date).split("（")[1]?.replace("）", "") || planDateLabel(e.date).slice(-3)}</span><small>{e.time?.slice(0, 5) || "時刻未登録"}</small>{e.date === today && <em>今日</em>}</div>
            <div className={styles.eventBody}><div className={styles.eventLabels}><span className={styles.kind}>{PLAN_KINDS[e.kind]}</span><span className={styles.status}>{PLAN_STATUSES[e.plan.status]}</span></div><h4>{e.plan.title}</h4>{!e.milestone && e.plan.venue && <p>{e.plan.venue}</p>}{e.milestone && <p>この公演に関連する{PLAN_KINDS[e.kind]}です。</p>}{e.plan.memo && <details><summary>メモを見る</summary><p className={styles.memo}>{e.plan.memo}</p></details>}
              <div className={styles.eventActions}><Link href={`/plans/${e.plan.id}/edit`}>編集 ↗</Link><a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer">Googleカレンダーに追加 ↗</a><button type="button" onClick={() => downloadPlans([e])}>.ics保存</button>{e.plan.work_id && <Link href={`/archive/works/${e.plan.work_id}`}>作品を詳しく ↗</Link>}{e.plan.url && <a href={e.plan.url} target="_blank" rel="noopener noreferrer">予約・公式サイト ↗</a>}{past && !e.milestone && e.kind === "theatre" && <Link href="/theater-log/new">観劇記録を残す ↗</Link>}</div>
            </div></article>)}</div></section>)}
        </section>
      </>}
    <CalendarImport today={today} onImported={reload}/>
    <p className={styles.footnote}>選択中のお名前ごとの予定です。現在のログインは名前選択方式で、本人認証ではありません。予定や締め切りのメール通知は行いません。</p>
  </>;
}
