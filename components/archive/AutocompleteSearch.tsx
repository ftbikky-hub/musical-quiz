"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SearchOption } from "@/app/archive/queries";

export function AutocompleteSearch({
  label,
  placeholder,
  searchAction,
}: {
  label: string;
  placeholder: string;
  searchAction: (query: string) => Promise<SearchOption[]>;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await searchAction(value);
      setOptions(result);
      setOpen(true);
    });
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {open && options.length > 0 && (
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
      {open && options.length === 0 && query.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          候補なし
        </div>
      )}
    </div>
  );
}
