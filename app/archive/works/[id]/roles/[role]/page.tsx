import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchArchiveWorkStat,
  fetchArchiveRoleActorStats,
  fetchArchiveRoleCastHistory,
} from "@/app/archive/queries";

export const revalidate = 0;

export default async function ArchiveRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string; role: string }>;
}) {
  const { id, role } = await params;
  const workId = Number(id);
  if (!Number.isFinite(workId)) notFound();

  const [stat, actorStats, history] = await Promise.all([
    fetchArchiveWorkStat(workId),
    fetchArchiveRoleActorStats(workId, role),
    fetchArchiveRoleCastHistory(workId, role),
  ]);

  if (!stat) notFound();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-500">
          <Link href={`/archive/works/${workId}`} className="text-blue-600 hover:underline">
            {stat.work_name}
          </Link>
        </p>
        <h1 className="text-xl font-bold text-gray-900">役: {role}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">出演者ごとの集計</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">出演者</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">公演期間数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">担当年</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actorStats.map((a) => (
                <tr key={a.actor} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/archive/actors/${encodeURIComponent(a.actor)}`} className="text-blue-600 hover:underline">
                      {a.actor}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{a.run_count}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {a.first_year === a.last_year ? a.first_year : `${a.first_year}〜${a.last_year}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">歴代キャスト</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">年</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">公演期間</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">会場</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">出演者</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">班</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{h.year}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.run_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.venue_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/archive/actors/${encodeURIComponent(h.actor)}`} className="text-blue-600 hover:underline">
                      {h.actor}
                    </Link>
                    {h.actor_alias && <span className="text-gray-400">（{h.actor_alias}）</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.team ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
