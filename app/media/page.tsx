import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { extractDriveFileId, driveEmbedUrl, driveThumbnailUrl } from "@/lib/drive";
import { DeleteMediaButton } from "@/components/media/DeleteMediaButton";
import { deleteMedia } from "./actions";

export const revalidate = 0; // 常に最新の一覧を取得する

type MediaType = "video" | "audio" | "photo";

type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  description: string | null;
  drive_url: string;
  thumbnail_url: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<MediaType, string> = {
  video: "動画",
  audio: "音楽",
  photo: "写真",
};

const TABS: { value?: MediaType; label: string }[] = [
  { value: undefined, label: "すべて" },
  { value: "video", label: "動画" },
  { value: "audio", label: "音楽" },
  { value: "photo", label: "写真" },
];

function buildHref(q: string | undefined, type: MediaType | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  const qs = params.toString();
  return qs ? `/media?${qs}` : "/media";
}

function MediaPreview({ item }: { item: MediaItem }) {
  const fileId = extractDriveFileId(item.drive_url);
  const thumbFileId = item.thumbnail_url ? extractDriveFileId(item.thumbnail_url) : null;

  if (item.type === "audio") {
    return (
      <div className="bg-gray-100">
        {thumbFileId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driveThumbnailUrl(thumbFileId)}
            alt={item.title}
            className="w-full aspect-square object-cover"
          />
        )}
        {fileId ? (
          <iframe
            src={driveEmbedUrl(fileId)}
            className="w-full h-24"
            style={{ border: 0 }}
            allow="autoplay"
          />
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            読み込めません
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-gray-100">
      {fileId ? (
        <iframe
          src={driveEmbedUrl(fileId)}
          className="w-full h-full"
          style={{ border: 0 }}
          allow="autoplay"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          読み込めません
        </div>
      )}
    </div>
  );
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  const activeType =
    type === "video" || type === "audio" || type === "photo" ? type : undefined;

  let query = supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (activeType) {
    query = query.eq("type", activeType);
  }

  const { data: items, error } = await query;

  if (error) {
    return <p>データの取得に失敗しました。</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">メディア</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; トップに戻る
        </Link>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = tab.value === activeType;
          return (
            <Link
              key={tab.label}
              href={buildHref(q, tab.value)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                isActive
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <form method="GET" className="flex gap-2 flex-1 max-w-md">
          {activeType && <input type="hidden" name="type" value={activeType} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="タイトル・説明で検索"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm shrink-0"
          >
            検索
          </button>
        </form>

        <Link
          href="/media/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm text-center shrink-0"
        >
          + 追加
        </Link>
      </div>

      {items?.length === 0 && (
        <p className="text-gray-500 text-sm">
          {q || activeType ? "条件に一致するものがありません。" : "まだ何もありません。"}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items?.map((item: MediaItem) => (
          <div
            key={item.id}
            className="rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col bg-white"
          >
            <MediaPreview item={item} />
            <div className="p-4 flex-1 flex flex-col">
              <span className="inline-block w-fit text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 mb-1">
                {TYPE_LABELS[item.type]}
              </span>
              <h3 className="font-semibold text-sm mb-1 text-gray-800">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
              )}
              <div className="mt-auto pt-2 flex items-center gap-3">
                <Link
                  href={`/media/${item.id}/edit`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  編集
                </Link>
                <DeleteMediaButton id={item.id} action={deleteMedia} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
