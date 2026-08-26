import Link from "next/link";
import {
  fetchCastPerformerById,
  fetchPerformerAppearances,
  fetchTheaterBreakdown,
  fetchCoAppearanceRanking,
} from "@/lib/supabase/cast-queries";
import type {
  CastPerformer,
  CastAppearanceWithRelations,
  CastTheaterBreakdown,
  CastCoAppearanceRankingRow,
} from "@/lib/supabase/types";
import { fmtYMD } from "@/lib/date-utils";
import { formatLoadError } from "@/lib/error-utils";

export const dynamic = "force-dynamic";

function roleLabel(roleName: string, trackNo: number | null) {
  return trackNo ? `${roleName}${trackNo}` : roleName;
}

export default async function CastPerformerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const performerId = Number(id);

  if (!Number.isFinite(performerId)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-sm text-neutral-500">
        不正なページです。
      </main>
    );
  }

  let performer: CastPerformer | null = null;
  let appearances: CastAppearanceWithRelations[] = [];
  let theaterBreakdown: CastTheaterBreakdown[] = [];
  let coAppearance: CastCoAppearanceRankingRow[] = [];
  let loadError: string | null = null;

  try {
    [performer, appearances, theaterBreakdown, coAppearance] =
      await Promise.all([
        fetchCastPerformerById(performerId),
        fetchPerformerAppearances(performerId),
        fetchTheaterBreakdown(performerId),
        fetchCoAppearanceRanking(performerId, 10),
      ]);
  } catch (err) {
    loadError = formatLoadError(err);
  }

  // 役ごとの累計登板数（演目名 + 役名でまとめる）。
  const roleCounts = new Map<
    string,
    { workTitle: string; roleName: string; count: number }
  >();
  for (const a of appearances ?? []) {
    const key = `${a.performance.work.id}:${a.role.id}`;
    const existing = roleCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      roleCounts.set(key, {
        workTitle: a.performance.work.title,
        roleName: a.role.role_name,
        count: 1,
      });
    }
  }
  const roleCountRows = Array.from(roleCounts.values()).sort(
    (a, b) => b.count - a.count
  );

  const sortedAppearances = [...(appearances ?? [])].sort((a, b) =>
    b.performance.performance_date.localeCompare(a.performance.performance_date)
  );

  const total = appearances?.length ?? 0;
  const firstDate = appearances?.[0]?.performance.performance_date;
  const lastDate = appearances?.[appearances.length - 1]?.performance
    .performance_date;

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
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

        {!loadError && !performer && (
          <p className="text-sm text-neutral-500">
            該当する役者さんが見つかりませんでした。
          </p>
        )}

        {!loadError && performer && (
          <>
            <h1 className="mb-1 text-2xl font-bold sm:text-3xl">
              {performer.name}
            </h1>
            <p className="mb-6 text-sm text-neutral-500">
              累計登板数 {total} 回
              {firstDate && lastDate && (
                <>
                  　（{fmtYMD(firstDate)} 〜 {fmtYMD(lastDate)}）
                </>
              )}
            </p>

            <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold">役ごとの累計登板数</h2>
              {roleCountRows.length === 0 ? (
                <p className="text-xs text-neutral-400">出演記録がありません。</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {roleCountRows.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-neutral-100 py-1.5 text-sm last:border-b-0"
                    >
                      <span>
                        {r.workTitle} ／ {r.roleName}
                      </span>
                      <span className="font-bold">{r.count} 回</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold">劇場ごとの登板数</h2>
              {theaterBreakdown && theaterBreakdown.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {theaterBreakdown.map((t) => (
                    <div
                      key={t.theater_id}
                      className="flex items-center justify-between border-b border-neutral-100 py-1.5 text-sm last:border-b-0"
                    >
                      <span>{t.theater_name}</span>
                      <span className="font-bold">
                        {t.appearance_count} 回
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">記録がありません。</p>
              )}
            </section>

            <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold">
                共演が多い人（上位10人）
              </h2>
              {coAppearance && coAppearance.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {coAppearance.map((c, i) => (
                    <div
                      key={c.performer_id}
                      className="flex items-center justify-between border-b border-neutral-100 py-1.5 text-sm last:border-b-0"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-4 text-right text-xs text-neutral-400">
                          {i + 1}
                        </span>
                        <Link
                          href={`/cast/performer/${c.performer_id}`}
                          className="font-bold hover:underline"
                        >
                          {c.performer_name}
                        </Link>
                      </span>
                      <span className="text-xs text-neutral-500">
                        {c.co_count} 回共演
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">共演記録がありません。</p>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold">出演履歴（新しい順）</h2>
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                      <th className="py-2 pr-2 font-bold">日付</th>
                      <th className="py-2 pr-2 font-bold">演目</th>
                      <th className="py-2 pr-2 font-bold">劇場</th>
                      <th className="py-2 font-bold">役</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAppearances.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-neutral-100 last:border-b-0"
                      >
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          <Link
                            href={`/cast/performance/${a.performance.id}`}
                            className="hover:underline"
                          >
                            {fmtYMD(a.performance.performance_date)}
                            {a.performance.session
                              ? `(${a.performance.session})`
                              : ""}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-2">
                          {a.performance.work.title}
                        </td>
                        <td className="py-1.5 pr-2">
                          {a.performance.theater.name}
                        </td>
                        <td className="py-1.5">
                          {roleLabel(a.role.role_name, a.track_no)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
