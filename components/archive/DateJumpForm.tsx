"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DateJumpForm({ initial }: { initial?: string }) {
  const router = useRouter();
  const [date, setDate] = useState(initial ?? "");

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (date) router.push(`/archive/date?d=${date}`);
      }}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        required
      />
      <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm shrink-0">
        表示
      </button>
    </form>
  );
}
