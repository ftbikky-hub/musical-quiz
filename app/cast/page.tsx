import { PageHeading } from "@/components/theatre/PageHeading";
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
        <PageHeading section="cast" title="過去キャスト一覧">
          あの役を演じた、その人にもう一度。配役や共演のつながりをたどってみましょう。
          <br />対象作品：『アナと雪の女王』『ノートルダムの鐘』の過去公演。
        </PageHeading>

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            データの取得に失敗しました：{loadError}
            <br />
            時間をおいて、もう一度お試しください。
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
