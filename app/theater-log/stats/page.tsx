import Link from "next/link";
import {
  fetchStatsTotal,
  fetchStatsByYear,
  fetchStatsByWork,
  fetchStatsByTheater,
  fetchStatsByActor,
  fetchRankingByUser,
  fetchRatingGapRanking,
  fetchAllProfiles,
} from "@/lib/supabase/theater-log-queries";
import { createClient } from "@/lib/supabase/server";
import { StatsTabs } from "@/components/theater-log/StatsTabs";

export const revalidate = 0;

export default async function TheaterLogStatsPage() {
  const [total, byYear, byWork, byTheater, byActor, rankingByUser, ratingGap, profiles] =
    await Promise.all([
      fetchStatsTotal(),
      fetchStatsByYear(),
      fetchStatsByWork(),
      fetchStatsByTheater(),
      fetchStatsByActor(),
      fetchRankingByUser(),
      fetchRatingGapRanking(),
      fetchAllProfiles(),
    ]);

  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">実績</h1>
        <Link href="/theater-log" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>

      <StatsTabs
        profiles={profiles}
        currentUserId={user?.id ?? null}
        total={total}
        byYear={byYear}
        byWork={byWork}
        byTheater={byTheater}
        byActor={byActor}
        rankingByUser={rankingByUser}
        ratingGap={ratingGap}
      />
    </div>
  );
}
