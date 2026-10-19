"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { matchesArchiveSearch } from "@/lib/archive-search";
import type { SearchOption } from "@/app/archive/queries";
import styles from "./library.module.css";

const MAX_RESULTS = 20;

export function AutocompleteSearch({ label, placeholder, fetchAllOptions }: {
  label: string;
  placeholder: string;
  fetchAllOptions: () => Promise<SearchOption[]>;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [allOptions, setAllOptions] = useState<SearchOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(-1);
  const resultsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let current = true;
    startTransition(() => {
      fetchAllOptions().then((rows) => {
        if (current) { setAllOptions(rows); setFailed(false); }
      }).catch(() => { if (current) setFailed(true); });
    });
    return () => { current = false; };
  }, [fetchAllOptions, attempt]);

  const trimmed = query.trim();
  const matches = allOptions && trimmed
    ? allOptions.filter((option) => matchesArchiveSearch(option.searchText ?? option.label, trimmed)) : [];
  const options = matches.slice(0, MAX_RESULTS);

  return (
    <div className={styles.searchField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputRow}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>
        <input id={id} type="search" value={query} placeholder={placeholder}
          autoComplete="off" aria-describedby={`${id}-status`} aria-controls={`${id}-results`}
          onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && options.length) {
              event.preventDefault(); setActive(0); resultsRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
            }
            if (event.key === "Enter" && options.length === 1) {
              event.preventDefault(); resultsRef.current?.querySelector<HTMLAnchorElement>("a")?.click();
            }
            if (event.key === "Escape") { setQuery(""); setActive(-1); }
          }} />
      </div>
      <div id={`${id}-status`} className={styles.searchStatus} role="status">
        {failed ? <span>検索を読み込めませんでした。<button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>もう一度読み込む</button></span>
          : allOptions === null ? "検索の準備をしています…"
          : !trimmed ? "気になる名前や言葉を入力してください。全半角・名前の空白違いにも対応しています。"
          : matches.length === 0 ? "該当する項目が見つかりません。短い言葉や別の表記でお試しください。"
          : `${matches.length.toLocaleString()}件${matches.length > MAX_RESULTS ? `のうち先頭${MAX_RESULTS}件を表示しています。言葉を追加すると絞り込めます。` : "見つかりました。項目を選んで詳しく見る。"}`}
      </div>
      {options.length > 0 && <ul ref={resultsRef} id={`${id}-results`} className={styles.searchResults}>
        {options.map((option, index) => <li key={option.href}>
          <Link href={option.href} className={active === index ? styles.activeResult : undefined}
            onFocus={() => setActive(index)} onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
                resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a")[next]?.focus();
              }
            }}>{option.label}<span aria-hidden="true">↗</span></Link>
        </li>)}
      </ul>}
    </div>
  );
}
