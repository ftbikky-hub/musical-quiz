"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { compareTwoUsers, fetchPersonalTimeline } from "@/app/theater-log/actions";
import type {
  Profile,
  TheaterLog,
  TheaterLogActorStat,
  TheaterLogRatingGap,
  TheaterLogTheaterStat,
  TheaterLogUserRanking,
  TheaterLogWorkStat,
  TheaterLogYearStat,
  TwoUserComparison,
} from "@/lib/supabase/types";

const SLOT_LABELS: Record<string, string> = {
  matinee: "マチネ",
  soiree: "ソワレ",
  other: "その他",
};

const TABS = [
  { key: "overall", label: "全体ランキング" },
  { key: "compare", label: "二人で比較" },
  { key: "timeline", label: "個人タイムライン" },
  { key: "gap", label: "感想の食い違い" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

function LogList({ logs, emptyText }: { logs: TheaterLog[]; emptyText: string }) {
  if (logs.length === 0) {
    return <p className="text-xs text-gray-400">{emptyText}</p>;
  }
  return (
    <ul className="text-sm text-gray-700 divide-y divide-gray-50">
      {logs.map((l) => (
        <li key={l.id} className="py-1.5">
          <Link href={`/theater-log/${l.id}`} className="hover:underline">
            <span className="text-gray-400 mr-2">{l.watched_on}</span>
            {l.work_title}
            {l.performance_slot && (
              <span className="text-gray-400 ml-1">
                ({SLOT_LABELS[l.performance_slot]})
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserSelect({
  profiles,
  value,
  onChange,
  label,
}: {
  profiles: Profile[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
      >
        <option value="">選択してください</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatsTabs({
  profiles,
  currentUserId,
  total,
  byYear,
  byWork,
  byTheater,
  byActor,
  rankingByUser,
  ratingGap,
}: {
  profiles: Profile[];
  currentUserId: string | null;
  total: number;
  byYear: TheaterLogYearStat[];
  byWork: TheaterLogWorkStat[];
  byTheater: TheaterLogTheaterStat[];
  byActor: TheaterLogActorStat[];
  rankingByUser: TheaterLogUserRanking[];
  ratingGap: TheaterLogRatingGap[];
}) {
  const [tab, setTab] = useState<TabKey>("overall");

  const [userA, setUserA] = useState(currentUserId ?? "");
  const [userB, setUserB] = useState("");
  const [comparison, setComparison] = useState<TwoUserComparison | null>(null);
  const [comparePending, startCompare] = useTransition();

  const [timelineUser, setTimelineUser] = useState(currentUserId ?? "");
  const [timeline, setTimeline] = useState<TheaterLog[] | null>(null);
  const [timelinePending, startTimeline] = useTransition();

  function nameOf(id: string) {
    return profiles.find((p) => p.id === id)?.display_name ?? "";
  }

  function runCompare() {
    if (!userA || !userB || userA === userB) return;
    startCompare(async () => {
      const result = await compareTwoUsers(userA, userB);
      setComparison(result);
    });
  }

  function runTimeline(userId: string) {
    setTimelineUser(userId);
    setTimeline(null);
    if (!userId) return;
    startTimeline(async () => {
      const result = await fetchPersonalTimeline(userId);
      setTimeline(result);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overall" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-500">総観劇回数</p>
            <p className="text-4xl font-bold text-gray-900">{total}</p>
          </div>
          <RankTable
            title="ユーザー別観劇数ランキング"
            rows={rankingByUser.map((r) => ({
              label: r.display_name,
              count: r.log_count,
            }))}
          />
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
      )}

      {tab === "compare" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-4 items-end">
              <UserSelect profiles={profiles} value={userA} onChange={setUserA} label="ユーザーA" />
              <UserSelect profiles={profiles} value={userB} onChange={setUserB} label="ユーザーB" />
              <button
                type="button"
                onClick={runCompare}
                disabled={!userA || !userB || userA === userB || comparePending}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {comparePending ? "比較中..." : "比較する"}
              </button>
            </div>
            {userA && userB && userA === userB && (
              <p className="text-xs text-red-500">異なる2人を選んでください</p>
            )}
          </div>

          {comparison && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700">{nameOf(userA)}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    総観劇数: {comparison.summaryA.total}回
                  </p>
                  <p className="text-xs text-gray-500">
                    よく行く劇場: {comparison.summaryA.topTheater ?? "-"}
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700">{nameOf(userB)}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    総観劇数: {comparison.summaryB.total}回
                  </p>
                  <p className="text-xs text-gray-500">
                    よく行く劇場: {comparison.summaryB.topTheater ?? "-"}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  2人とも見た公演({comparison.together.length}件)
                </h3>
                <LogList logs={comparison.together} emptyText="まだありません" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {nameOf(userA)}だけ見た公演({comparison.onlyA.length}件)
                  </h3>
                  <LogList logs={comparison.onlyA} emptyText="ありません" />
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {nameOf(userB)}だけ見た公演({comparison.onlyB.length}件)
                  </h3>
                  <LogList logs={comparison.onlyB} emptyText="ありません" />
                </div>
              </div>

              {comparison.autoMatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    同じ日・同じ公演を別々に記録している可能性
                  </h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {comparison.autoMatches.map((m) => (
                      <li key={`${m.logIdA}-${m.logIdB}`}>
                        {m.watched_on} {m.work_title}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700 mt-2">
                    それぞれの編集画面から同行者に追加すると「一緒に行った」として扱われます
                  </p>
                </div>
              )}

              <RankTable
                title="推し被り(共通してよく見ている俳優)"
                rows={comparison.commonActors.map((a) => ({
                  label: a.actor_name,
                  count: a.countA + a.countB,
                }))}
              />
            </div>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <UserSelect
              profiles={profiles}
              value={timelineUser}
              onChange={runTimeline}
              label="ユーザー"
            />
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            {timelinePending ? (
              <p className="text-xs text-gray-400">読み込み中...</p>
            ) : timeline ? (
              <LogList logs={timeline} emptyText="記録がありません" />
            ) : (
              <p className="text-xs text-gray-400">ユーザーを選んでください</p>
            )}
          </div>
        </div>
      )}

      {tab === "gap" && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            感想の食い違いランキング
          </h2>
          {ratingGap.length === 0 ? (
            <p className="text-xs text-gray-400">
              同じ作品を2人以上が評価しているデータがまだありません
            </p>
          ) : (
            <ul className="text-sm text-gray-700 divide-y divide-gray-50">
              {ratingGap.map((g) => (
                <li
                  key={`${g.user_a_id}-${g.user_b_id}`}
                  className="flex justify-between py-1.5"
                >
                  <span>
                    {g.user_a_name} × {g.user_b_name}
                  </span>
                  <span className="text-gray-400">
                    平均差 {g.avg_gap}(共通{g.common_count}作品)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
