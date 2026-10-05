import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchArchiveActorStat,
  fetchArchiveActorHistory,
  fetchArchiveActorRoleStats,
  fetchArchiveStaffSummaryByPerson,
} from "@/app/archive/queries";
import { BackButton } from "@/components/archive/BackButton";

export const revalidate = 0;

export default async function ArchiveActorDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const [stat, history, roleStats, staffSummary] = await Promise.all([
    fetchArchiveActorStat(name),
    fetchArchiveActorHistory(name),
    fetchArchiveActorRoleStats(name),
    fetchArchiveStaffSummaryByPerson(name),
  ]);

  if (!stat) notFound();

  return (
    <div className="space-y-8">
      <div>
        <BackButton />
        <h1 className="text-xl font-bold text-gray-900 mt-1">{stat.actor}</h1>
        <p className="text-sm text-gray-500 mt-1">
          出演公演期間数 {stat.run_count} ／ 出演作品数 {stat.work_count} ／ {stat.first_year}年〜
          {stat.last_year}年
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">出演履歴</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">年</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">役</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">会場</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{h.year}</td>
                  <td className="px-3 py-2">
                    <Link href={`/archive/works/${h.work_id}`} className="text-blue-600 hover:underline">
                      {h.work_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/archive/works/${h.work_id}/roles/${encodeURIComponent(h.role)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {h.role}
                    </Link>
                    {h.actor_alias && <span className="text-gray-400">（{h.actor_alias}）</span>}
                    {h.team && <span className="text-gray-400"> [{h.team}]</span>}
                  </td>
                  <td className="px-3 py-2">{h.venue_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">演じた役の一覧</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">役</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">公演期間数</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">担当年</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleStats.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/archive/works/${r.work_id}`} className="text-blue-600 hover:underline">
                      {r.work_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/archive/works/${r.work_id}/roles/${encodeURIComponent(r.role)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.role}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.run_count}</td>
                  <td className="px-3 py-2">
                    {r.first_year === r.last_year ? r.first_year : `${r.first_year}〜${r.last_year}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {staffSummary.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">
            スタッフ担当歴（同名の<Link href={`/archive/staff/${encodeURIComponent(name)}`} className="text-blue-600 hover:underline">スタッフ詳細</Link>）
          </h2>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">職種</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">年</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffSummary.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{s.job}</td>
                    <td className="px-3 py-2">
                      <Link href={`/archive/works/${s.work_id}`} className="text-blue-600 hover:underline">
                        {s.work_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {s.first_year === s.last_year ? s.first_year : `${s.first_year}〜${s.last_year}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
