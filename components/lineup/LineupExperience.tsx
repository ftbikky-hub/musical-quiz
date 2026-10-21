"use client";

import { useEffect, useState } from "react";
import { LineupPlanner } from "./LineupPlanner";
import { lineupCurrentMonth, type LineupSnapshot } from "@/lib/lineup";
import styles from "./lineup.module.css";

export function LineupExperience({ snapshot }: { snapshot: LineupSnapshot }) {
  const [history, setHistory] = useState(false);
  const [bounds, setBounds] = useState<{ firstYear: number | null; lastYear: number | null } | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [result, setResult] = useState<LineupSnapshot | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!history) return;
    const controller = new AbortController();
    async function load() {
      setError("");
      try {
        const response = await fetch(`/api/lineup/history${year === null ? "" : `?year=${year}`}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("公演の歴史を読み込めませんでした。");
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (year === null) { setBounds(data); setYear(data.lastYear); }
        else setResult(data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
      }
    }
    void load();
    return () => controller.abort();
  }, [history, year, retry]);
  const currentYear = bounds ? Number(lineupCurrentMonth(new Date()).slice(0, 4)) : Number(snapshot.checked.slice(0, 4));
  const years = bounds?.firstYear ? Array.from({ length: Math.max(currentYear, bounds.lastYear ?? currentYear) - bounds.firstYear + 1 }, (_, i) => Math.max(currentYear, bounds.lastYear ?? currentYear) - i) : [];
  return <>
    <div className={styles.historyTabs} role="group" aria-label="予定と公演の歴史"><button type="button" aria-pressed={!history} onClick={() => setHistory(false)}>これからの上演予定</button><button type="button" aria-pressed={history} onClick={() => setHistory(true)}>公演の歴史をたどる</button></div>
    {!history && <LineupPlanner snapshot={snapshot}/>}
    {history && <section aria-label="公演の歴史の年間表">
      <div className={styles.historyHeading}><div><p className={styles.eyebrow}>THE STAGE THROUGH THE YEARS</p><h2>あの年、幕が上がった作品たち。</h2><p>「公演の歴史」の記録を、作品と月の表で見渡す。</p></div>
        {years.length > 0 && <label>年を選ぶ <select aria-label="公演の歴史の年" value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}年{bounds?.lastYear && y > bounds.lastYear ? "（未収録）" : ""}</option>)}</select></label>}
      </div>
      {error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((n) => n + 1)}>もう一度読み込む</button></div>
        : bounds && bounds.lastYear === null ? <p className={styles.coverage}>公演の歴史はまだ収録されていません。</p>
        : result?.historyYear === year ? <LineupPlanner key={year} snapshot={result}/>
        : <p role="status" className={styles.coverage}>公演の歴史を読み込んでいます…</p>}
    </section>}
  </>;
}
