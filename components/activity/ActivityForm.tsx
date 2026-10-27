"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ACTIVITY_KINDS, normalizeActivity, type ActivityInput } from "@/lib/activity";
import { japanDate } from "@/lib/plans";
import styles from "@/components/plans/plans.module.css";
export function ActivityForm({ id, sourcePlanId }: { id?: string; sourcePlanId?: string }) {
  const router = useRouter();
  const [value, setValue] = useState<ActivityInput>({ kind: "theatre", date: "", time: null, title: "", venue: "", city: "", memo: "" });
  const [loading, setLoading] = useState(!!id || !!sourcePlanId), [loadError, setLoadError] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id && !sourcePlanId) return;
    const controller = new AbortController();
    fetch(id ? `/api/activity/${id}` : `/api/plans/${sourcePlanId}`, { cache: "no-store", signal: controller.signal }).then(async r => {
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "読み込めませんでした。");
      const fields = id ? data : { kind: data.kind === "concert" ? "concert" : "theatre", date: data.date, time: data.time, title: data.title, venue: data.venue, city: "", memo: "" };
      if (!id && (!["theatre", "concert"].includes(data.kind) || ["cancelled", "not_selected"].includes(data.status) || data.date > japanDate(new Date()))) throw new Error("この予定はまだ行動記録にできません。");
      // 会場未記入の予定も、フォームで補ってから保存できる。
      if (!controller.signal.aborted) { setValue({ kind: fields.kind, date: fields.date, time: fields.time?.slice(0, 5) || null, title: fields.title, venue: fields.venue || "", city: fields.city || "", memo: fields.memo || "" }); setLoadError(""); }
    }).catch(e => { if (!controller.signal.aborted) setLoadError(e.message || "読み込めませんでした。"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, sourcePlanId, retry]);
  function field<K extends keyof ActivityInput>(key: K, next: ActivityInput[K]) { setValue(old => ({ ...old, [key]: next })); }
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); let fields;
    try { fields = normalizeActivity(value, new Date()); } catch (e) { setError(e instanceof Error ? e.message : "記録を確認してください。"); return; }
    setBusy(true);
    try { const r = await fetch(id ? `/api/activity/${id}` : "/api/activity", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, ...(!id && sourcePlanId ? { source_plan_id: sourcePlanId } : {}) }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "保存できませんでした。"); router.push("/activity"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); setBusy(false); }
  }
  async function remove() {
    if (!id || !window.confirm("この行動記録を削除しますか？ 元の予定や観劇記録は残ります。")) return;
    setBusy(true); setError("");
    try { const r = await fetch(`/api/activity/${id}`, { method: "DELETE" }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "削除できませんでした。"); router.push("/activity"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); setBusy(false); }
  }
  if (loading) return <p role="status">記録を読み込んでいます…</p>;
  if (loadError) return <div className={styles.empty} role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>もう一度読み込む</button><Link href="/activity">行動記録に戻る</Link></div>;
  return <form className={styles.form} onSubmit={save}><Link href="/activity" className={styles.back}>← 行動記録に戻る</Link>{sourcePlanId && <p className={styles.notice}>予定の内容を引き継ぎました。実際に訪れた日時と会場を確認して保存してください。元の予定は変更しません。</p>}<fieldset disabled={busy}><legend>いつ、どこで、何に出会った？</legend>
    <label>種類<select aria-label="記録の種類" value={value.kind} onChange={e => field("kind", e.target.value as ActivityInput["kind"])}>{Object.entries(ACTIVITY_KINDS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
    <div className={styles.twoColumns}><label>日付 <span>必須</span><input aria-label="日付" type="date" value={value.date} required min="1900-01-01" onChange={e => field("date", e.target.value)}/></label><label>時刻（任意）<input aria-label="時刻" type="time" value={value.time || ""} onChange={e => field("time", e.target.value || null)}/></label></div><p className={styles.help}>過去の日付も登録できます。時刻が分からなければ空欄のままで大丈夫です。日本時間で記録します。</p>
    <label>作品・イベント名 <span>必須</span><input aria-label="作品・イベント名" value={value.title} required maxLength={200} placeholder="映画のタイトル、コンサート、ファンミーティング…" onChange={e => field("title", e.target.value)}/></label>
    <label>会場 <span>必須</span><input aria-label="会場" value={value.venue} required maxLength={500} placeholder="映画館・劇場・ホールの名前" onChange={e => field("venue", e.target.value)}/></label>
    <label>エリア・都市（任意）<input aria-label="エリア・都市" value={value.city} maxLength={200} placeholder="横浜、日比谷、大阪など" onChange={e => field("city", e.target.value)}/></label><p className={styles.help}>同じ名前の会場を区別する手がかりになります。後で地図で振り返るときにも役立ちます。</p>
    <details className={styles.optional}><summary>ひとこと残す（任意）</summary><label>メモ<textarea aria-label="メモ" value={value.memo} rows={4} maxLength={3000} onChange={e => field("memo", e.target.value)} placeholder="この日のことを、ひとことだけ。"/></label></details>
    {error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.formActions}><button type="submit" className={styles.primary}>{busy ? "処理しています…" : "行った記録を残す"}</button><Link href="/activity">戻る</Link>{id && <button type="button" className={styles.delete} onClick={remove}>この記録を削除</button>}</div>
  </fieldset></form>;
}
