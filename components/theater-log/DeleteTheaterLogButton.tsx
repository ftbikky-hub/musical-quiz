"use client";

import { useTransition } from "react";

export function DeleteTheaterLogButton({
  id,
  action,
  className,
}: {
  id: string;
  action: (id: string) => Promise<void>;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("削除しますか?")) return;
        startTransition(() => {
          action(id);
        });
      }}
      className={className ?? "text-xs text-red-600 hover:underline disabled:opacity-50"}
    >
      {pending ? "削除中..." : "削除"}
    </button>
  );
}
