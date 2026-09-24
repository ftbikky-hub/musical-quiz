"use client";

import { useEffect, useRef, useState } from "react";

export function Autocomplete({
  value,
  onChange,
  fetchCandidates,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  fetchCandidates: (query: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
}) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const results = await fetchCandidates(value);
      if (requestId.current === id) setCandidates(results);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={
          className ?? "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        }
      />
      {open && candidates.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-sm text-sm">
          {candidates.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
