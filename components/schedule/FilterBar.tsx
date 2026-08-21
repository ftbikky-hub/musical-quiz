"use client";

import { useState, useRef, useEffect } from "react";
import type { Work } from "@/lib/supabase/types";

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
          selected.length > 0
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {selected.length}
          </span>
        )}
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-md px-2 py-1 text-left text-xs text-neutral-400 hover:bg-neutral-50"
            >
              選択をクリア
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5"
              />
              {opt.color && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  works,
  regions,
  selectedRegions,
  onChangeRegions,
  selectedWorkIds,
  onChangeWorkIds,
}: {
  works: Work[];
  regions: string[];
  selectedRegions: string[];
  onChangeRegions: (v: string[]) => void;
  selectedWorkIds: string[];
  onChangeWorkIds: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelectPopover
        label="地域"
        options={regions.map((r) => ({ value: r, label: r }))}
        selected={selectedRegions}
        onChange={onChangeRegions}
      />
      <MultiSelectPopover
        label="演目"
        options={works.map((w) => ({
          value: w.id,
          label: w.title,
          color: w.color_code,
        }))}
        selected={selectedWorkIds}
        onChange={onChangeWorkIds}
      />
    </div>
  );
}
