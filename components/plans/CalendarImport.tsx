"use client";
import { useState } from "react";
import { PLAN_KINDS, planDateLabel, type PlanKind } from "@/lib/plans";
import type { CalendarImport as CalendarImportResult } from "@/lib/plan-calendar-import";
import styles from "./plans.module.css";

export function CalendarImport({ today, onImported }: { today: string; onImported: () => void }) {
  const [result, setResult] = useState<CalendarImportResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const candidates = result?.candidates.filter(c => c.plan.date >= today).sort((a, b) => a.plan.date.localeCompare(b.plan.date)) || [];
  async function read(file: File | undefined) {
    setResult(null); setSelected(new Set()); setMessage(""); setError(""); if (!file) return;
    if (file.size > 2_000_000) { setError("2MB以下の.icsファイルを選んでください。"); return; }
    setBusy(true);
    try {
      const { parsePlanCalendar } = await import("@/lib/plan-calendar-import");
      const parsed = parsePlanCalendar(await file.text()); setResult(parsed);
      setSelected(new Set(parsed.candidates.filter(c => c.suggested && c.plan.date >= today).slice(0, 100).map(c => c.key)));
    } catch (e) { setError(e instanceof Error ? e.message : "ファイルを読み込めませんでした。"); }
    finally { setBusy(false); }
  }
  function kind(key: string, value: PlanKind) { setResult(old => old && ({ ...old, candidates: old.candidates.map(c => c.key === key ? { ...c, plan: { ...c.plan, kind: value } } : c) })); }
  async function save() {
    setError(""); setMessage("");
    const plans = candidates.filter(c => selected.has(c.key)).map(c => c.plan);
    if (plans.length < 1 || plans.length > 100) { setError("取り込む予定を1〜100件選んでください。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plans) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "取り込めませんでした。");
      setMessage(`${data.count}件を取り込みました。取り込み済み${data.skipped}件は変更していません。`); setSelected(new Set()); onImported();
    } catch (e) { setError(e instanceof Error ? e.message : "取り込めませんでした。"); }
    finally { setBusy(false); }
  }
  return <details className={styles.importBox} id="calendar-import"><summary>Googleカレンダーから予定を取り込む <span>＋</span></summary>
    <div className={styles.importBody}><p>Googleカレンダーの「設定 → インポート／エクスポート → エクスポート」から書き出し、ZIPを展開して中の <strong>.icsファイル</strong>を選んでください。PC版で操作できます。</p>
      <p>まずこの画面で候補を確認し、選んだ予定だけ保存します。自動同期ではありません。再取り込みで登録済みの予定を上書きせず、Google側の変更・削除も自動反映しません。時刻は日本時間で表示し、タイムゾーン指定のない予定も日本時間として扱います。</p>
      <label className={styles.fileLabel}>カレンダーファイルを選ぶ<input type="file" accept=".ics,text/calendar" disabled={busy} onChange={e => void read(e.target.files?.[0])}/></label>
      {busy && <p role="status">処理しています…</p>}
      {result && <><p>{candidates.length}件のこれからの予定。観劇などのキーワードに一致する候補を選択しています。種類と内容を確認してください。</p>
        {(result.recurring > 0 || result.skipped > 0) && <p className={styles.notice}>繰り返し予定・その例外{result.recurring}件、キャンセル済み・日時を確認できない予定など{result.skipped}件は取り込んでいません。必要な予定は手入力してください。</p>}
        <div className={styles.toolbar}><button type="button" onClick={() => setSelected(new Set(candidates.slice(0, 100).map(c => c.key)))}>先頭100件まで選択</button><button type="button" onClick={() => setSelected(new Set())}>選択を解除</button><span>{selected.size}件選択中</span></div>
        <div className={styles.importList}>{candidates.map(c => <div key={c.key} className={styles.importRow}>
          <label><input type="checkbox" checked={selected.has(c.key)} disabled={busy} onChange={() => setSelected(old => { const next = new Set(old); if (next.has(c.key)) next.delete(c.key); else next.add(c.key); return next; })}/><span><strong>{c.plan.title}</strong><small>{c.plan.date.slice(0, 4)}年 {planDateLabel(c.plan.date)} {c.plan.time || "時刻指定なし"}<br/>{c.plan.venue}</small></span></label>
          <select aria-label={`${c.plan.title}の種類`} value={c.plan.kind} disabled={busy} onChange={e => kind(c.key, e.target.value as PlanKind)}>{Object.entries(PLAN_KINDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        </div>)}</div>
        {candidates.length > 0 && <button type="button" className={styles.primary} disabled={busy || selected.size === 0 || selected.size > 100} onClick={save}>選んだ予定を取り込む</button>}
      </>}
      {message && <p role="status" className={styles.success}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  </details>;
}
