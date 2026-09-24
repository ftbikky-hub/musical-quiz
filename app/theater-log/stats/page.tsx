import Link from "next/link";
import {
  fetchStatsTotal,
  fetchStatsByYear,
  fetchStatsByWork,
  fetchStatsByTheater,
  fetchStatsByActor,
} from "@/lib/supabase/theater-log-queries";

export const revalidate = 0;

function RankTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">データがありません</p>
      ) : (
        <ul className="text-sm text-gray-700 divide-y divide-gray-50">
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between py-1.5">
              <span className="truncate">{r.label}</span>
              <span className="text-gray-400 shrink-0 ml-2">{r.count}回</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function TheaterLogStatsPage() {
  const [total, byYear, byWork, byTheater, byActor] = await Promise.all([
    fetchStatsTotal(),
    fetchStatsByYear(),
    fetchStatsByWork(),
    fetchStatsByTheater(),
    fetchStatsByActor(),
  ]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">実績</h1>
        <Link href="/theater-log" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
        <p className="text-xs text-gray-500">総観劇回数</p>
        <p className="text-4xl font-bold text-gray-900">{total}</p>
      </div>

      <RankTable
        title="年別"
        rows={byYear.map((r) => ({ label: `${r.year}年`, count: r.log_count }))}
      />
      <RankTable
        title="作品別"
        rows={byWork.map((r) => ({ label: r.work_title, count: r.log_count }))}
      />
      <RankTable
        title="劇場別"
        rows={byTheater.map((r) => ({ label: r.theater, count: r.log_count }))}
      />
      <RankTable
        title="俳優別ランキング"
        rows={byActor.map((r) => ({ label: r.actor_name, count: r.log_count }))}
      />
    </div>
  );
}
