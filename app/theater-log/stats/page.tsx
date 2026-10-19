import Link from "next/link";
import { PageHeading } from "@/components/theatre/PageHeading";
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
      <PageHeading section="journal" title="観劇の足跡を振り返る。" actions={<Link href="/theater-log" className="text-sm text-blue-600 hover:underline">← 一覧に戻る</Link>}>
        何度も出会った作品、心に残る出演者。積み重ねた記録から、あなたの舞台の旅を振り返ります。
      </PageHeading>

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
