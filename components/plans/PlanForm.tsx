"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PLAN_KINDS, PLAN_STATUSES, normalizePlan, type PlanInput } from "@/lib/plans";
import styles from "./plans.module.css";
function blank(title: string, venue: string): PlanInput { return { title, venue, kind: "theatre", status: "planned", date: "", time: null, end_date: null, end_time: null, memo: "", url: "", work_id: null, deadline_date: null, deadline_time: null, result_date: null, result_time: null, source_uid: null }; }
export function PlanForm({ id, works, initialTitle = "", initialVenue = "" }: { id?: string; works: { id: number; name: string }[]; initialTitle?: string; initialVenue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState<PlanInput>(() => ({ ...blank(initialTitle, initialVenue), work_id: works.find(w => w.name === initialTitle)?.id || null }));
  const [loading, setLoading] = useState(!!id), [loadError, setLoadError] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`/api/plans/${id}`, { cache: "no-store", signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "予定を読み込めませんでした。"); if (!controller.signal.aborted) { setValue(normalizePlan(data)); setLoadError(""); } })
      .catch(e => { if (!controller.signal.aborted) setLoadError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  function field<K extends keyof PlanInput>(key: K, next: PlanInput[K]) { setValue(old => ({ ...old, [key]: next })); }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    let plan: PlanInput; try { plan = normalizePlan(value); } catch (e) { setError(e instanceof Error ? e.message : "入力を確認してください。"); return; }
    setBusy(true);
    try {
      const response = await fetch(id ? `/api/plans/${id}` : "/api/plans", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "保存できませんでした。"); router.push("/plans"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); setBusy(false); }
  }
  async function remove() {
    if (!id || !window.confirm("この予定と、関連する締め切り・当落発表を削除しますか？")) return;
    setBusy(true); setError("");
    try { const response = await fetch(`/api/plans/${id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "削除できませんでした。"); router.push("/plans"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); setBusy(false); }
  }
  function dateField(key: "date" | "end_date" | "deadline_date" | "result_date", label: string, required = false) { return <label>{label}<input type="date" value={value[key] || ""} required={required} min="1900-01-01" max="2199-12-31" onChange={e => { if (key === "date") field(key, e.target.value); else field(key, e.target.value || null); }}/></label>; }
  function timeField(key: "time" | "end_time" | "deadline_time" | "result_time", label: string) { return <label>{label}<input type="time" value={value[key]?.slice(0, 5) || ""} onChange={e => field(key, e.target.value || null)}/></label>; }
  if (loading) return <p role="status">予定を読み込んでいます…</p>;
  if (loadError) return <div className={styles.empty} role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>もう一度読み込む</button><Link href="/plans">予定に戻る</Link></div>;
  const showLottery = value.kind === "theatre" || value.kind === "concert";
  return <form className={styles.form} onSubmit={save}><Link href="/plans" className={styles.back}>← 私の予定に戻る</Link><fieldset disabled={busy}><legend>楽しみのチケット</legend>
    <div className={styles.twoColumns}><label>予定の種類<select aria-label="予定の種類" value={value.kind} onChange={e => field("kind", e.target.value as PlanInput["kind"])}>{Object.entries(PLAN_KINDS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>チケット・申し込みの状態<select aria-label="チケット・申し込みの状態" value={value.status} onChange={e => field("status", e.target.value as PlanInput["status"])}>{Object.entries(PLAN_STATUSES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div>
    <label>作品・公演名 <span>必須</span><input value={value.title} required maxLength={200} list="plan-work-titles" placeholder="ノートルダムの鐘、好きな歌声のコンサート…" onChange={e => { field("title", e.target.value); field("work_id", works.find(w => w.name === e.target.value)?.id || null); }}/></label><datalist id="plan-work-titles">{works.map(w => <option key={w.id} value={w.name}/>)}</datalist>
    <div className={styles.twoColumns}>{dateField("date", value.kind === "deadline" ? "締め切り日（必須）" : value.kind === "result" ? "発表日（必須）" : "公演日（必須）", true)}{timeField("time", value.kind === "deadline" ? "締め切り時刻（任意）" : value.kind === "result" ? "発表時刻（任意）" : "開演時刻（任意）")}</div><p className={styles.help}>すべて日本時間です。時刻未発表の場合は空欄にできます。</p>
    <details className={styles.optional}><summary>終了日・終了時刻を入れる（任意）</summary><div className={styles.twoColumns}>{dateField("end_date", "終了日")}{timeField("end_time", "終了時刻")}</div><p className={styles.help}>終了日が空欄なら公演日と同じ日として扱います。終日の複数日予定は、終了日に最終日を入力してください。</p></details>
    <label>劇場・会場<input value={value.venue} maxLength={500} placeholder="劇場・ホールの名前" onChange={e => field("venue", e.target.value)}/></label>
    <label>舞台の図書室とつなぐ（任意）<select aria-label="舞台の図書室とつなぐ" value={value.work_id || ""} onChange={e => field("work_id", e.target.value ? Number(e.target.value) : null)}><option value="">連携しない</option>{works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    {showLottery && <section className={styles.lotteryFields}><p className={styles.eyebrow}>BEFORE THE CURTAIN RISES</p><h2>申し込みから、当落まで。</h2><p>この公演にひもづく日付を、予定一覧にも並べます。</p><div className={styles.twoColumns}>{dateField("deadline_date", "抽選申し込みの締め切り日")}{timeField("deadline_time", "締め切り時刻")}{dateField("result_date", "当落発表日")}{timeField("result_time", "発表時刻")}</div></section>}
    <label>予約・公式サイトのURL<input type="url" value={value.url} maxLength={2000} placeholder="https://…" onChange={e => field("url", e.target.value)}/></label><label>メモ<textarea value={value.memo} maxLength={5000} rows={5} placeholder="座席、同行者、申し込み先など、忘れたくないこと。" onChange={e => field("memo", e.target.value)}/></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.formActions}><button className={styles.primary} type="submit">{busy ? "処理しています…" : "予定を保存する"}</button><Link href="/plans">戻る</Link>{id && <button type="button" className={styles.delete} onClick={remove}>この予定を削除</button>}</div>
  </fieldset></form>;
}
