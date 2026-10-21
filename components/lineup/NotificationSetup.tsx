"use client";

import { useEffect, useState } from "react";
import styles from "./notifications.module.css";

export function NotificationSetup() {
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [showSource, setShowSource] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/downloads/lineup-monitor.gs", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("load");
      return response.text();
    }).then((text) => { if (active) setSource(text); }).catch(() => { if (active) setStatus("コードを読み込めませんでした。ページを再読み込みしてください。"); });
    return () => { active = false; };
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(source); setStatus("コピーしました。Apps Scriptのコード欄へ貼り付けてください。"); }
    catch { setShowSource(true); setStatus("コピーできませんでした。下のコード欄を選択してコピーしてください。"); }
  }
  return <div className={styles.setup}>
    <div className={styles.summary}><strong>公式が変わったときだけ、あなたのGmailへ。</strong><p>表画像の内容と注記を1日1回確認します。変更のない日は通知しません。公演データの書き換えは行いません。</p></div>
    <ol className={styles.steps}>
      <li><span>01</span><div><h2>自分のGoogleアカウントで、新規作成</h2><p>通知を受け取りたいGmailのアカウントを使ってください。</p><a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener noreferrer">Apps Scriptを開く ↗</a></div></li>
      <li><span>02</span><div><h2>コードをコピーして、貼り付ける</h2><p>最初に入っているコードをすべて消し、このコードに置き換えて保存します。名前は「四季の上演予定お知らせ」などで大丈夫です。</p><button type="button" onClick={copy} disabled={!source}>通知用コードをコピー</button><a className={styles.download} href="/downloads/lineup-monitor.gs" download="lineup-monitor.gs">ファイルで保存</a><p role="status">{status || (!source ? "コードを準備しています…" : "送信先は、実行するGoogleアカウント自身です。")}</p></div></li>
      <li><span>03</span><div><h2>初回だけ、設定を実行する</h2><p>上部の関数選択で <code>setupLineupNotifications</code> を選び、「実行」を押します。Googleの確認画面で、実行・メール送信などの権限を確認して許可してください。</p><p>受信箱を読む権限は使いません。許可後に実行が止まっている場合は、もう一度同じ関数を実行してください。</p><p><strong>「上演予定お知らせの送信テスト」というメールが届き、実行ログに「設定完了」と出れば完了です。</strong> 以後は毎日9〜10時頃（日本時間）に動きます。</p></div></li>
    </ol>
    <div className={styles.note}><h2>確認・停止もできます</h2><p>今すぐ確認：<code>checkLineupNotifications</code><br/>稼働状況の表示：<code>showLineupNotificationStatus</code><br/>通知の停止：<code>stopLineupNotifications</code><br/>再開：<code>setupLineupNotifications</code></p><p>いずれもApps Scriptで関数を選んで「実行」します。このサイトからGoogle側の設定完了・稼働状況を確認することはできません。</p></div>
    <details open={showSource} onToggle={(event) => setShowSource(event.currentTarget.open)} className={styles.code}><summary>通知用コードを見る</summary><textarea aria-label="通知用コード" readOnly value={source} onFocus={(event) => event.currentTarget.select()}/></details>
  </div>;
}
