import Link from "next/link";
import { PageHeading } from "@/components/theatre/PageHeading";
import { EmptyState } from "@/components/theatre/EmptyState";
import { fetchTheaterLogs } from "@/lib/supabase/theater-log-queries";
import { supabase } from "@/lib/supabase/client";
import { requireJournalMember } from "@/lib/journal-members";
import { logout } from "@/app/auth/actions";

export const revalidate = 0;

const SLOT_LABELS: Record<string, string> = {
  matinee: "マチネ",
  soiree: "ソワレ",
  other: "その他",
};

const PHOTO_BUCKET = "theater-photos";

function photoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function buildHref(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `/theater-log?${s}` : "/theater-log";
}

export default async function TheaterLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    work?: string;
    theater?: string;
    actor?: string;
  }>;
}) {
  const { from, to, work, theater, actor } = await searchParams;

  const member = await requireJournalMember();
  const items = await fetchTheaterLogs({ from, to, work, theater, actor });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <PageHeading section="journal" title="私の観劇手帳" actions={member.display_name && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">{member.display_name}</span>
          <Link href="/login?redirectTo=/theater-log" className="text-sm text-blue-600 hover:underline">名前を切り替える</Link>
          <form action={logout}><button type="submit" className="text-sm text-gray-500 hover:underline">選択を解除</button></form>
        </div>
      )}>
        忘れたくない歌声も、幕が下りたあとの気持ちも。あなたが出会った舞台を、一ページずつ残していきましょう。
      </PageHeading>

      <div className="flex gap-3 flex-wrap">
        <Link href="/activity" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">映画・コンサートも残す行動記録 ↗</Link>
        <Link href="/plans" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">これからの予定を見る ↗</Link>
        <Link
          href="/theater-log/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm text-center shrink-0"
        >
          + 観劇を記録する
        </Link>
        <Link
          href="/theater-log/stats"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm text-center shrink-0"
        >
          観劇を振り返る
        </Link>
      </div>

      <form
        method="GET"
        className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white border border-gray-100 rounded-xl p-4"
      >
        <label className="block col-span-1">
          <span className="block text-xs text-gray-500 mb-1">観劇日（開始）</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block col-span-1">
          <span className="block text-xs text-gray-500 mb-1">観劇日（終了）</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block col-span-1">
          <span className="block text-xs text-gray-500 mb-1">作品</span>
          <input
            name="work"
            defaultValue={work}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block col-span-1">
          <span className="block text-xs text-gray-500 mb-1">劇場</span>
          <input
            name="theater"
            defaultValue={theater}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block col-span-1">
          <span className="block text-xs text-gray-500 mb-1">俳優</span>
          <input
            name="actor"
            defaultValue={actor}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <div className="col-span-2 sm:col-span-5 flex gap-2">
          <button
            type="submit"
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm"
          >
            検索
          </button>
          <Link
            href={buildHref({})}
            className="px-4 py-1.5 text-sm text-gray-500 hover:underline"
          >
            クリア
          </Link>
        </div>
      </form>

      {items.length === 0 && (
        <EmptyState title={from || to || work || theater || actor ? "この条件の観劇記録は見つかりませんでした。" : "最初の一幕を、手帳に。"}>
          {from || to || work || theater || actor ? "日付や作品名などの条件を変えて探してみてください。" : "「観劇を記録する」から、心に残った舞台を残しましょう。"}
        </EmptyState>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const firstPhoto = item.photos[0];
          const mainCasts = item.casts.slice(0, 4);
          return (
            <Link
              key={item.id}
              href={`/theater-log/${item.id}`}
              className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow"
            >
              {firstPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl(firstPhoto.storage_path)}
                  alt=""
                  className="w-24 h-24 rounded-lg object-cover shrink-0 bg-gray-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-xs">
                  No Photo
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.watched_on}</span>
                  {item.performance_slot && (
                    <span>{SLOT_LABELS[item.performance_slot]}</span>
                  )}
                  {item.rating && (
                    <span className="text-yellow-500">
                      {"★".repeat(item.rating)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {item.work_title}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {[item.theater, item.seat].filter(Boolean).join(" / ")}
                </p>
                {mainCasts.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">
                    {mainCasts.map((c) => c.actor_name).join("、")}
                    {item.casts.length > mainCasts.length && " ほか"}
                  </p>
                )}
                {item.impression && (
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {item.impression}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
