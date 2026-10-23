"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./plans.module.css";
interface Connection { calendar_id: string; mode: "keywords" | "all"; expires_at: string; revoked: boolean; expired?: boolean; last_synced_at: string | null; last_counts: {added:number;updated:number;cancelled:number;seen:number} | null }
export function CalendarSyncSetup() {
  const [connection, setConnection] = useState<Connection | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [calendarId, setCalendarId] = useState("primary"), [mode, setMode] = useState<"keywords" | "all">("keywords"), [busy, setBusy] = useState(false);
  const [code, setCode] = useState(""), [manifest, setManifest] = useState(""), [message, setMessage] = useState("");
  const initialized = useRef(false);
  async function refresh() {
    try { const r = await fetch("/api/plans/calendar/connection", { cache: "no-store" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "設定を読み込めませんでした。"); setConnection(d); if (!initialized.current) { initialized.current = true; if (d) { setCalendarId(d.calendar_id); setMode(d.mode); } } setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "設定を読み込めませんでした。"); }
    finally { setLoading(false); }
  }
  useEffect(() => { let active = true; async function load() { if (active) await refresh(); } void load(); const timer = setInterval(load, 30_000); return () => { active = false; clearInterval(timer); }; }, []);
  async function generate() {
    if (connection && !connection.revoked && !connection.expired && !window.confirm("接続コードを作り直すと、今のコードは無効になります。新しいコードをApps Scriptへ貼り直しますか？")) return;
    setBusy(true); setError(""); setMessage(""); setCode("");
    try {
      const [source, json] = await Promise.all([fetch("/downloads/personal-calendar-sync.gs", { cache: "no-store" }), fetch("/downloads/personal-calendar-appsscript.json", { cache: "no-store" })]);
      if (!source.ok || !json.ok) throw new Error("設定コードを読み込めませんでした。");
      const template = await source.text(), settings = await json.text();
      if (!template.includes("/* THEATRE_NOTES_CONFIG */ null")) throw new Error("コードを読み込めませんでした。再読み込みしてください。");
      const response = await fetch("/api/plans/calendar/connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarId, mode }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "設定を保存できませんでした。");
      setCode(template.replace("/* THEATRE_NOTES_CONFIG */ null", JSON.stringify({ endpoint: `${window.location.origin}/api/plans/calendar/sync`, token: data.token, calendarId: data.calendarId, mode: data.mode })));
      setManifest(settings); await refresh(); setMessage("専用コードを発行しました。下の手順でGoogle側の初回設定を行ってください。");
    } catch (e) { setError(e instanceof Error ? e.message : "設定できませんでした。"); } finally { setBusy(false); }
  }
  async function stop() {
    if (!window.confirm("このお名前の自動更新接続を停止しますか？ 保存済みの予定は残ります。")) return;
    setBusy(true); setError("");
    try { const r = await fetch("/api/plans/calendar/connection", { method: "DELETE" }); if (!r.ok) throw new Error("停止できませんでした。"); setCode(""); await refresh(); setMessage("接続を停止しました。保存済みの予定は残っています。"); }
    catch (e) { setError(e instanceof Error ? e.message : "停止できませんでした。"); } finally { setBusy(false); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setMessage("コピーしました。"); } catch { setMessage("下の欄を選択してコピーしてください。"); } }
  const time = (value: string) => new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  return <div className={styles.form}><Link href="/plans" className={styles.back}>← 私の予定に戻る</Link>
    <section className={styles.syncStatus} aria-label="自動更新の接続状況"><h2>手帳とのつながり</h2>{loading ? <p role="status">接続状況を確認しています…</p> : connection ? <><p>{connection.revoked ? "接続は停止中です。" : connection.expired ? "接続コードの期限が切れています。新しいコードを発行してください。" : connection.last_synced_at ? "Google側からの同期を受け取っています。" : "専用コード発行済み・初回の同期待ちです。"}</p><p>最終同期：{connection.last_synced_at ? time(connection.last_synced_at) : "まだありません"}</p><p>接続コードの期限：{time(connection.expires_at)}</p>{connection.last_counts && <p>前回：追加{connection.last_counts.added}件・更新{connection.last_counts.updated}件・対象外／削除{connection.last_counts.cancelled}件</p>}{!connection.revoked && <button type="button" disabled={busy} onClick={stop}>接続を停止する</button>}</> : <p>まだ自動更新を設定していません。</p>}<button type="button" disabled={busy} onClick={refresh}>状況を確認する</button></section>
    <section className={styles.syncInstructions}><h2>Google側で、一度だけ設定。</h2><p>Gmail通知とは別の、新しいApps Scriptプロジェクトを使います。Googleカレンダーは読み取り専用で、Google側の予定を変更しません。</p><p>対象は昨日〜約2年先の予定です。繰り返し予定は対象外です。Googleから対象の一覧で見つからなくなった予定は、サイトでキャンセル表示として残します。大量に消えた場合は自動反映を保留します。</p><p>チケット状態・メモ・作品の連携・抽選の関連日付は保持します。日時や会場も、サイトで書き換えた項目は保持します。同期対象の予定をサイトで削除すると、次の同期で再登録されるため、削除はGoogle側で行ってください。</p></section>
    <fieldset disabled={busy || loading}><legend>取り込むカレンダー</legend><label>GoogleカレンダーのID<input value={calendarId} maxLength={500} placeholder="primary" onChange={e => setCalendarId(e.target.value)}/></label><p className={styles.help}>通常のメインカレンダーならprimaryのまま。別のカレンダーはGoogleカレンダーの設定→カレンダーの統合→カレンダーIDを入力します。</p><label>取り込む範囲<select aria-label="取り込む範囲" value={mode} onChange={e => setMode(e.target.value as "keywords" | "all")}><option value="keywords">観劇・コンサートなどのキーワードがある予定だけ</option><option value="all">このカレンダーのすべて（観劇専用カレンダー向け）</option></select></label><p className={styles.help}>キーワードは作品名の一部・観劇・舞台・コンサート・ライブ・締切・当落などです。見つからない予定はタイトルへ「観劇」「コンサート」などを加えてください。</p><button type="button" className={styles.primary} onClick={generate}>自動更新の設定コードを作る</button></fieldset>
    {code && <section className={styles.syncInstructions}><h2>1. コード.gs を貼り付ける</h2><p><a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener noreferrer">新しいApps Scriptを開く ↗</a>。最初のmyFunctionをすべて消して、下のコードへ置き換えて保存してください。</p><p className={styles.notice}>このコードには予定を更新できる専用キーが含まれます。他の人に共有しないでください。この画面を閉じた後は再表示できません。</p><button type="button" className={styles.primary} onClick={() => copy(code)}>コード.gsをコピー</button><details><summary>コードを表示・手動でコピー</summary><textarea aria-label="専用のコード.gs" className={styles.syncCode} readOnly value={code}/></details>
      <h2>2. appsscript.json を設定する</h2><p>Apps Script左側の歯車「プロジェクトの設定」で「appsscript.jsonマニフェストファイルをエディタで表示する」を有効にします。エディタへ戻り、appsscript.jsonを下の内容に置き換えて保存してください。</p><button type="button" onClick={() => copy(manifest)}>appsscript.jsonをコピー</button><details><summary>設定内容を表示</summary><textarea aria-label="appsscript.json" className={styles.syncCode} readOnly value={manifest}/></details>
      <h2>3. 初回実行して許可する</h2><p>上部の関数から <code>setupPersonalCalendarSync</code> を選び「実行」。Googleの権限画面で読み取りと定期実行を許可します。実行ログの「設定完了」と、このページの「最終同期」の両方を確認してください。右上のデプロイ操作は不要です。</p><p>確認後はGoogleの画面を閉じても動きます。接続コードは180日間有効で、期限後は作り直しと貼り替えが必要です。</p></section>}
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{message}</p>}
  </div>;
}
