import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchArchiveStaffSummaryByPerson, fetchArchiveActorStat } from "@/app/archive/queries";
import { BackButton } from "@/components/archive/BackButton";

export const revalidate = 0;

export default async function ArchiveStaffDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const [summary, actorStat] = await Promise.all([
    fetchArchiveStaffSummaryByPerson(name),
    fetchArchiveActorStat(name),
  ]);

  if (summary.length === 0) notFound();

  const byJob = new Map<string, typeof summary>();
  for (const s of summary) {
    const list = byJob.get(s.job) ?? [];
    list.push(s);
    byJob.set(s.job, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <BackButton />
        <h1 className="text-xl font-bold text-gray-900 mt-1">{name}</h1>
        {actorStat && (
          <p className="text-sm text-gray-500 mt-1">
            同名の
            <Link href={`/archive/actors/${encodeURIComponent(name)}`} className="text-blue-600 hover:underline">
              出演者詳細
            </Link>
            もあります。
          </p>
        )}
      </div>

      {[...byJob.entries()].map(([job, rows]) => (
        <section key={job} className="space-y-2">
          <h2 className="font-semibold text-gray-900">{job}</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">作品</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">年の範囲</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">公演期間数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/archive/works/${r.work_id}`} className="text-blue-600 hover:underline">
                        {r.work_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {r.first_year === r.last_year ? r.first_year : `${r.first_year}〜${r.last_year}`}
                    </td>
                    <td className="px-3 py-2">{r.run_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
