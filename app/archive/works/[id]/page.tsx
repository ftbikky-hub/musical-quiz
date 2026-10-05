import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchArchiveWorkStat,
  fetchArchiveWorkYearVenueStats,
  fetchArchiveWorkRuns,
  fetchArchiveWorkRoleStats,
  fetchArchiveWorkStaffSummary,
} from "@/app/archive/queries";
import { YearBarChart } from "@/components/archive/YearBarChart";

export const revalidate = 0;

function formatDate(d: string | null) {
  return d ?? "—";
}

export default async function ArchiveWorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workId = Number(id);
  if (!Number.isFinite(workId)) notFound();

  const [stat, yearVenue, runs, roles, staff] = await Promise.all([
    fetchArchiveWorkStat(workId),
    fetchArchiveWorkYearVenueStats(workId),
    fetchArchiveWorkRuns(workId),
    fetchArchiveWorkRoleStats(workId),
    fetchArchiveWorkStaffSummary(workId),
  ]);

  if (!stat) notFound();

  const byYear = new Map<number, number>();
  for (const row of yearVenue) {
    byYear.set(row.year, (byYear.get(row.year) ?? 0) + row.performances);
  }
  const chartData = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, performances]) => ({ year, performances }));

  const staffByJob = new Map<string, typeof staff>();
  for (const s of staff) {
    const list = staffByJob.get(s.job) ?? [];
    list.push(s);
    staffByJob.set(s.job, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{stat.work_name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          総公演回数 {stat.total_performances}回 ／ {stat.first_year}年〜{stat.last_year}年 ／ 会場数{" "}
          {stat.venue_count}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">年ごとの公演回数</h2>
        <YearBarChart data={chartData} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">年×会場</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">年</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">会場</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">公演回数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearVenue.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 whitespace-nowrap">{row.year}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.venue_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.performances}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">← 横にスクロールできます →</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">公演期間一覧</h2>
        <div className="space-y-2">
          {runs.map((r) => (
            <details key={r.perf_key} className="border border-gray-200 rounded-lg px-3 py-2">
              <summary className="cursor-pointer text-sm flex flex-wrap gap-2 items-baseline">
                <span className="text-gray-900">
                  {formatDate(r.start_date)} 〜 {formatDate(r.end_date)}
                </span>
                <span className="text-gray-600">{r.venue_name}</span>
                <span className="text-gray-400">{r.performances ?? "—"}回</span>
              </summary>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>公演名: {r.run_name}</p>
                {r.schedule_text && <p>日程: {r.schedule_text}</p>}
                {r.notes && <p>備考: {r.notes}</p>}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">役一覧</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">役名</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">演じた人数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">公演期間数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((r) => (
                <tr key={r.role} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/archive/works/${workId}/roles/${encodeURIComponent(r.role)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.role}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.actor_count}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.run_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">← 横にスクロールできます →</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">歴代スタッフ</h2>
        {[...staffByJob.entries()].map(([job, people]) => (
          <div key={job} className="space-y-1">
            <h3 className="text-sm font-medium text-gray-700">{job}</h3>
            <ul className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
              {people.map((p) => (
                <li key={`${job}-${p.person}`}>
                  <Link href={`/archive/staff/${encodeURIComponent(p.person)}`} className="text-blue-600 hover:underline">
                    {p.person}
                  </Link>
                  <span className="text-gray-400">
                    {" "}
                    ({p.first_year === p.last_year ? p.first_year : `${p.first_year}〜${p.last_year}`})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
