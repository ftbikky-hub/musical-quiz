import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { extractDriveFileId, driveEmbedUrl } from "@/lib/drive";
import { DeleteVideoButton } from "@/components/videos/DeleteVideoButton";
import { deleteVideo } from "./actions";

export const revalidate = 0; // 常に最新の一覧を取得する

type Video = {
  id: string;
  title: string;
  description: string | null;
  drive_url: string;
  created_at: string;
};

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let query = supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: videos, error } = await query;

  if (error) {
    return <p>動画の取得に失敗しました。</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">動画一覧</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; トップに戻る
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <form method="GET" className="flex gap-2 flex-1 max-w-md">
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
          href="/videos/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm text-center shrink-0"
        >
          + 動画を追加
        </Link>
      </div>

      {videos?.length === 0 && (
        <p className="text-gray-500 text-sm">
          {q ? "検索に一致する動画がありません。" : "まだ動画がありません。"}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos?.map((video: Video) => {
          const fileId = extractDriveFileId(video.drive_url);
          return (
            <div
              key={video.id}
              className="rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col bg-white"
            >
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
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-sm mb-1 text-gray-800">{video.title}</h3>
                {video.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{video.description}</p>
                )}
                <div className="mt-auto pt-2">
                  <DeleteVideoButton id={video.id} action={deleteVideo} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
