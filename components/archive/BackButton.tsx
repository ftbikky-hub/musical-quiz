import Link from "next/link";

/** 出演者・スタッフなど、どこからでも辿り着きうるページ用の「戻る」。
 * 履歴を辿るのではなく、常に検索画面(/archive)へ戻る。 */
export function BackButton({ href = "/archive" }: { href?: string }) {
  return (
    <Link href={href} className="text-sm text-blue-600 hover:underline">
      &larr; 検索に戻る
    </Link>
  );
}
