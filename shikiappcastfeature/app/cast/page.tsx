import Link from "next/link";
import CastShell from "@/components/cast/CastShell";
import { fetchWorks, fetchTheaters } from "@/lib/supabase/queries";
import {
  fetchCastRoles,
  fetchCastPerformers,
  fetchCastPerformances,
} from "@/lib/supabase/cast-queries";
import { formatLoadError } from "@/lib/error-utils";

// 読み取り専用の公開データのみを扱うため、サーバーコンポーネントで直接
// Supabase から取得し、クライアントコンポーネントに渡す。
export const dynamic = "force-dynamic";

export default async function CastPage() {
  let allWorks, allTheaters, roles, performers, performances;
  let loadError: string | null = null;

  try {
    [allWorks, allTheaters, roles, performers, performances] =
      await Promise.all([
        fetchWorks(),
        fetchTheaters(),
        fetchCastRoles(),
        fetchCastPerformers(),
        fetchCastPerformances(),
      ]);
  } catch (err) {
    loadError = formatLoadError(err);
  }

  // 過去キャスト一覧に実際にデータがある演目・劇場だけに絞る
  // （劇団四季全体の演目・劇場マスタには、今回対象外の作品も多く含まれるため）。
  const castWorkIds = new Set((roles ?? []).map((r) => r.work_id));
  const castTheaterIds = new Set(
    (performances ?? []).map((p) => p.theater_id)
  );
  const works = (allWorks ?? []).filter((w) => castWorkIds.has(w.id));
  const theaters = (allTheaters ?? []).filter((t) =>
    castTheaterIds.has(t.id)
  );

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
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
          🎭 劇団四季 過去キャスト一覧（非公式）
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          公式サイト・劇団四季とは関係のない個人用の確認ツールです。対象は「アナと雪の女王」「ノートルダムの鐘」の過去公演です。
        </p>

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            データの取得に失敗しました：{loadError}
            <br />
            .env.local の Supabase 接続設定をご確認ください。
          </div>
        ) : (
          <CastShell
            works={works}
            theaters={theaters}
            roles={roles!}
            performers={performers!}
            performances={performances!}
          />
        )}
      </div>
    </main>
  );
}
