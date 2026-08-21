import Link from "next/link";
import ScheduleShell from "@/components/schedule/ScheduleShell";
import {
  fetchWorks,
  fetchTheaters,
  fetchSchedules,
  fetchTicketReleases,
} from "@/lib/supabase/queries";

// 読み取り専用の公開データのみを扱うため、サーバーコンポーネントで直接
// Supabase から取得し、クライアントコンポーネントに渡す。
// キャッシュはせず、アクセスのたびに最新データを取得する。
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  let works, theaters, schedules, ticketReleases;
  let loadError: string | null = null;

  try {
    [works, theaters, schedules, ticketReleases] = await Promise.all([
      fetchWorks(),
      fetchTheaters(),
      fetchSchedules(),
      fetchTicketReleases(),
    ]);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "データの取得に失敗しました。";
  }

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            ← 入り口に戻る
          </Link>
          <span className="text-xs text-neutral-400">非公式ファンツール</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold sm:text-3xl">
          🎭 劇団四季スケジュール（非公式）
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          公式サイト・劇団四季とは関係のない個人用の確認ツールです。最新情報は必ず公式サイトでご確認ください。
        </p>

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            データの取得に失敗しました：{loadError}
            <br />
            .env.local の Supabase 接続設定をご確認ください。
          </div>
        ) : (
          <ScheduleShell
            works={works!}
            theaters={theaters!}
            schedules={schedules!}
            ticketReleases={ticketReleases!}
          />
        )}
      </div>
    </main>
  );
}
