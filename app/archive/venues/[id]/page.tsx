import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchArchiveVenueStat,
  fetchArchiveVenueWorkStats,
  fetchArchiveVenueRuns,
} from "@/app/archive/queries";

export const revalidate = 0;

export default async function ArchiveVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isFinite(venueId)) notFound();

  const [stat, workStats, runs] = await Promise.all([
    fetchArchiveVenueStat(venueId),
    fetchArchiveVenueWorkStats(venueId),
    fetchArchiveVenueRuns(venueId),
  ]);

  if (!stat) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/archive/venues" className="text-sm text-blue-600 hover:underline">
          &larr; 会場一覧に戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{stat.venue_name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {stat.venue_type} ／ 公演期間数 {stat.run_count} ／ 総公演回数 {stat.total_performances} ／{" "}
          {stat.first_year}年〜{stat.last_year}年 ／ 上演作品数 {stat.work_count}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">作品ごとの集計</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">公演期間数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">総公演回数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">年の範囲</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workStats.map((w) => (
                <tr key={w.work_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/archive/works/${w.work_id}`} className="text-blue-600 hover:underline">
                      {w.work_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{w.run_count}</td>
                  <td className="px-3 py-2">{w.total_performances}</td>
                  <td className="px-3 py-2">
                    {w.first_year === w.last_year ? w.first_year : `${w.first_year}〜${w.last_year}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">上演作品・公演期間一覧</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">年</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">期間</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">公演回数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">元の会場表記</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((r) => (
                <tr key={r.perf_key} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.year}</td>
                  <td className="px-3 py-2">
                    <Link href={`/archive/works/${r.work_id}`} className="text-blue-600 hover:underline">
                      {r.work_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.start_date ?? "—"} 〜 {r.end_date ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.performances ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{r.theater ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
