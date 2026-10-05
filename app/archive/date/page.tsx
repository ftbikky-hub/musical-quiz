import Link from "next/link";
import { fetchArchiveRunsOnDate, fetchArchiveRunCasts } from "@/app/archive/queries";
import { DateJumpForm } from "@/components/archive/DateJumpForm";

export const revalidate = 0;

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ArchiveDatePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;

  if (!d) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">日付から見る</h1>
        <DateJumpForm />
      </div>
    );
  }

  const runs = await fetchArchiveRunsOnDate(d);
  const castsByRun = await Promise.all(runs.map((r) => fetchArchiveRunCasts(r.perf_key)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">{d} に上演中の公演</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/archive/date?d=${shiftDate(d, -1)}`}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            &larr; 前日
          </Link>
          <Link
            href={`/archive/date?d=${shiftDate(d, 1)}`}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            翌日 &rarr;
          </Link>
        </div>
      </div>

      <DateJumpForm initial={d} />

      {runs.length === 0 && <p className="text-sm text-gray-500">この日に上演していた公演はありません。</p>}

      <div className="space-y-3">
        {runs.map((r, i) => (
          <details key={r.perf_key} className="border border-gray-200 rounded-xl px-4 py-3">
            <summary className="cursor-pointer space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <Link href={`/archive/works/${r.work_id}`} className="text-blue-600 hover:underline font-medium">
                  {r.work_name}
                </Link>
                <span className="text-sm text-gray-600">{r.venue_name}</span>
                <span className="text-xs text-gray-400">
                  {r.start_date ?? "—"} 〜 {r.end_date ?? "—"} ／ {r.performances ?? "—"}回
                </span>
              </div>
              {r.venue_type === "全国公演" && (
                <p className="text-xs text-amber-600">この日を含む期間に上演中(全国公演のため当日の公演地は不明)</p>
              )}
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">役</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">出演者</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">班</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {castsByRun[i].map((c, j) => (
                    <tr key={j}>
                      <td className="px-3 py-2">{c.role}</td>
                      <td className="px-3 py-2">
                        <Link href={`/archive/actors/${encodeURIComponent(c.actor)}`} className="text-blue-600 hover:underline">
                          {c.actor}
                        </Link>
                        {c.actor_alias && <span className="text-gray-400">（{c.actor_alias}）</span>}
                      </td>
                      <td className="px-3 py-2">{c.team ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
