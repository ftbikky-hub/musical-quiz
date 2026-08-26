import Link from "next/link";
import { fetchPerformanceCast } from "@/lib/supabase/cast-queries";
import { fmtYMD } from "@/lib/date-utils";
import { formatLoadError } from "@/lib/error-utils";

export const dynamic = "force-dynamic";

export default async function CastPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const performanceId = Number(id);

  if (!Number.isFinite(performanceId)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-sm text-neutral-500">
        不正なページです。
      </main>
    );
  }

  let cast: Awaited<ReturnType<typeof fetchPerformanceCast>> = [];
  let loadError: string | null = null;

  try {
    cast = await fetchPerformanceCast(performanceId);
  } catch (err) {
    loadError = formatLoadError(err);
  }

  const performance = cast?.[0]?.performance;

  // 同じ役に複数人（アンサンブル等）いる場合はまとめる。
  const grouped: {
    roleId: number;
    roleName: string;
    entries: { performerId: number; performerName: string; trackNo: number | null }[];
  }[] = [];
  for (const a of cast ?? []) {
    let group = grouped.find((g) => g.roleId === a.role.id);
    if (!group) {
      group = { roleId: a.role.id, roleName: a.role.role_name, entries: [] };
      grouped.push(group);
    }
    group.entries.push({
      performerId: a.performer.id,
      performerName: a.performer.name,
      trackNo: a.track_no,
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
        <Link
          href="/cast"
          className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← 過去キャスト一覧に戻る
        </Link>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            データの取得に失敗しました：{loadError}
          </div>
        )}

        {!loadError && !performance && (
          <p className="text-sm text-neutral-500">
            該当する公演が見つかりませんでした。
          </p>
        )}

        {!loadError && performance && (
          <>
            <p className="mb-1 text-xs font-bold text-neutral-400">
              {performance.work.title}
            </p>
            <h1 className="mb-1 text-2xl font-bold sm:text-3xl">
              {fmtYMD(performance.performance_date)}（{performance.weekday}）
              {performance.session ? ` ${performance.session}` : ""}
            </h1>
            <p className="mb-6 text-sm text-neutral-500">
              {performance.theater.name}
            </p>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold">この日の配役</h2>
              <div className="flex flex-col gap-3">
                {grouped.map((g) => (
                  <div
                    key={g.roleId}
                    className="flex flex-col gap-1 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
                  >
                    <span className="w-32 shrink-0 text-xs font-bold text-neutral-400">
                      {g.roleName}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {g.entries.map((e, i) => (
                        <Link
                          key={i}
                          href={`/cast/performer/${e.performerId}`}
                          className="flex items-center gap-1 text-sm font-bold hover:underline"
                        >
                          {e.trackNo != null && (
                            <span className="text-xs font-normal text-neutral-400">
                              {e.trackNo}
                            </span>
                          )}
                          {e.performerName}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
