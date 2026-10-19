"use client";

import Link from "next/link";
import styles from "@/components/archive/library.module.css";

export default function ArchiveError({ reset }: { reset: () => void }) {
  return <div className={styles.notice} role="alert">
    <h1>公演記録を読み込めませんでした。</h1>
    <p>検索結果が0件になったのではなく、データの読み込みに失敗しています。時間をおいて、もう一度お試しください。</p>
    <button type="button" onClick={reset} className="underline mr-5">もう一度読み込む</button>
    <Link href="/archive" className="underline">図書室の入口へ</Link>
  </div>;
}
