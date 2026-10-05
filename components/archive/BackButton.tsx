"use client";

import { useRouter } from "next/navigation";

/** 出演者・スタッフなど、どこからでも辿り着きうるページ用の「戻る」。
 * ブラウザ履歴を一つ戻し、履歴がなければ/archiveへ。 */
export function BackButton({ fallbackHref = "/archive" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="text-sm text-blue-600 hover:underline"
    >
      &larr; 戻る
    </button>
  );
}
