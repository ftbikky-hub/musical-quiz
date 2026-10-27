"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ACTIVITY_KINDS, filterActivity, type ActivityRecord, type ActivityKind } from "@/lib/activity";
import { planDateLabel, PLAN_KINDS, type PersonalPlan } from "@/lib/plans";
import base from "@/components/plans/plans.module.css";
import styles from "./activity.module.css";
export function ActivityJournal({ today }: { today: string }) {
  const [records, setRecords] = useState<ActivityRecord[]>([]), [plans, setPlans] = useState<PersonalPlan[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [year, setYear] = useState(""), [kind, setKind] = useState(""), [query, setQuery] = useState(""), [retry, setRetry] = useState(0), [plansError, setPlansError] = useState(""), [plansLoading, setPlansLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/activity", { cache: "no-store", signal: controller.signal }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "記録を読み込めませんでした。"); if (!controller.signal.aborted) { setRecords(data); setError(""); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  async function loadPlans() {
    setPlansLoading(true);
    try { const r = await fetch("/api/plans", { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "予定を読み込めませんでした。"); setPlans(data); setPlansError(""); }
    catch (e) { setPlansError(e instanceof Error ? e.message : "予定を読み込めませんでした。"); }
    finally { setPlansLoading(false); }
  }
  const items = filterActivity(records, year, kind, query), months = [...new Set(items.map(r => r.date.slice(0, 7)))];
  const years = [...new Set(records.map(r => r.date.slice(0, 4)))].sort().reverse();
  const imported = new Set(records.map(r => r.source_plan_id));
  const completed = plans.filter(p => ["theatre", "concert"].includes(p.kind) && !["cancelled", "not_selected"].includes(p.status) && p.date <= today && !imported.has(p.id)).sort((a, b) => b.date.localeCompare(a.date));
  return <><div className={base.topActions}><Link className={base.primary} href="/activity/new">＋ 行った記録を残す</Link><Link href="/activity/map">思い出の日本地図 ↗</Link><Link href="/plans">これからの予定 ↗</Link><Link href="/theater-log">キャストも残す観劇記録 ↗</Link></div>
    {loading ? <p role="status">記録を読み込んでいます…</p> : error ? <div className={base.empty} role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>もう一度読み込む</button></div> : <>
      <section className={styles.keepsake} aria-label="記録の振り返り"><div><p className={base.eyebrow}>DAYS WORTH KEEPING</p><h2>好きに会いに、出かけた日。</h2><p>キャストも感想も、いったん置いて。<br/>行った場所から、あなたの一年が見えてくる。</p></div><div className={styles.numbers}><strong>{records.length}<span>残した記録</span></strong><strong>{new Set(records.map(r => r.venue.normalize("NFKC").trim())).size}<span>会場名</span></strong></div></section>
      <section className={styles.journal} aria-labelledby="activity-title"><div className={base.agendaHeading}><div><p className={base.eyebrow}>MY DAYS & PLACES</p><h2 id="activity-title">私のお出かけ手帳</h2></div><label className={styles.year}>年を選ぶ<select aria-label="記録の年" value={year} onChange={e => setYear(e.target.value)}><option value="">すべての年</option>{years.map(y => <option key={y} value={y}>{y}年</option>)}</select></label></div>
        <div className={base.filters}><div className={base.segment} role="group" aria-label="記録の種類"><button type="button" aria-pressed={!kind} onClick={() => setKind("")}>すべて</button>{Object.entries(ACTIVITY_KINDS).map(([id, name]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id as ActivityKind)}>{name}</button>)}</div><label><span className="sr-only">記録を検索</span><input type="search" aria-label="記録を検索" value={query} placeholder="作品・会場・都市で探す" onChange={e => setQuery(e.target.value)}/></label></div>
        <p className={base.count} role="status">{items.length}件の記録 · 新しい日付から</p>
        {items.length === 0 && <div className={base.empty}><h3>{records.length ? "この条件の記録はありません。" : "最初の一歩を、ここに。"}</h3><p>日付・作品やイベント名・会場が分かれば残せます。<br/>キャストの入力は必要ありません。</p><Link href="/activity/new">行った記録を残す ↗</Link></div>}
        {months.map(month => <section className={base.month} key={month} aria-label={`${month.slice(0, 4)}年${Number(month.slice(5))}月の記録`}><h3>{month.slice(0, 4)}<span>{Number(month.slice(5))}月</span></h3><div>{items.filter(r => r.date.startsWith(month)).map(r => <article key={r.id} className={`${base.event} ${styles[r.kind]}`}><div className={`${base.date} ${styles.recordDate}`}><strong>{Number(r.date.slice(8))}</strong><span>{planDateLabel(r.date).slice(-3)}</span><small>{r.time?.slice(0, 5) || "時刻未記入"}</small></div><div className={base.eventBody}><span className={styles.badge}>{ACTIVITY_KINDS[r.kind]}</span><h4>{r.title}</h4><p>{r.venue}</p>{r.city && <p>{r.city}</p>}{r.memo && <details><summary>ひとことを見る</summary><p className={base.memo}>{r.memo}</p></details>}<div className={base.eventActions}><Link href={`/activity/${r.id}/edit`}>記録を編集 ↗</Link>{r.source_plan_id && <span>予定から残した記録</span>}</div></div></article>)}</div></section>)}
      </section>
    </>}
    <details className={base.importBox} onToggle={e => { if (e.currentTarget.open) void loadPlans(); }}><summary>過去の「私の予定」から、行った記録を残す <span>＋</span></summary><div className={base.importBody}><p>実際に行った予定を選んでください。種類・日時・作品名・会場を引き継いで、確認してから保存できます。Googleカレンダーの予定を自動で実績にはしません。</p>{plansError && <p className={base.error} role="alert">{plansError}</p>}{plansLoading && <p role="status">予定を読み込んでいます…</p>}{!plansLoading && !plansError && completed.length === 0 && <p>記録できる予定がまだないか、すでに記録済みです。手入力では昔の出来事も残せます。</p>}<div className={base.importList}>{completed.map(p => <div className={base.importRow} key={p.id}><div><strong>{p.title}</strong><small>{p.date} · {PLAN_KINDS[p.kind]} · {p.venue || "会場未記入"}</small></div><Link href={`/activity/new?plan=${p.id}`}>行った記録にする ↗</Link></div>)}</div></div></details>
    <aside className={styles.nextChapter}><p className={base.eyebrow}>A MAP OF YOUR MEMORIES</p><h2>通った回数だけ、思い出の塔が育つ。</h2><p>映画も、舞台も、好きな人に会えた日も。日本地図に積み上がる、あなただけの足跡。日付順に再生して振り返れます。</p><Link className={base.primary} href="/activity/map">日本地図で思い出を再生 ↗</Link></aside>
    <p className={base.footnote}>選択中のお名前ごとの記録です。キャストを残す観劇記録とは別に保存します。名前選択方式で利用する、個人・知人向けの手帳です。</p>
  </>;
}
