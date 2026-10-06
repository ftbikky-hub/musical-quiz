"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchOption } from "@/app/archive/queries";

const MAX_RESULTS = 20;

export function AutocompleteSearch({
  label,
  placeholder,
  fetchAllOptions,
}: {
  label: string;
  placeholder: string;
  fetchAllOptions: () => Promise<SearchOption[]>;
}) {
  const [query, setQuery] = useState("");
  const [allOptions, setAllOptions] = useState<SearchOption[] | null>(null);
  const [open, setOpen] = useState(false);
  const loadStarted = useRef(false);
  const router = useRouter();

  // 候補は一度だけ丸ごと取得してキャッシュし、以降はブラウザ内で絞り込む
  // (ILIKE部分一致はDB側の毎回のスキャンが遅いため)。
  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    fetchAllOptions().then(setAllOptions);
  }, [fetchAllOptions]);

  const trimmed = query.trim();
  const options =
    allOptions && trimmed
      ? allOptions
          .filter((o) => (o.searchText ?? o.label).includes(trimmed))
          .slice(0, MAX_RESULTS)
      : [];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={allOptions === null ? "候補を読み込み中…" : placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {open && trimmed && options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.href}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-800"
                onClick={() => router.push(opt.href)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && trimmed && options.length === 0 && allOptions !== null && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          候補なし
        </div>
      )}
    </div>
  );
}
