import { fetchVideos, fetchFilterOptions } from "@/lib/yt-queries";
import YoutubeIndexShell from "@/components/youtube/YoutubeIndexShell";
import Link from "next/link";

// 常に最新のデータを取得する
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "公式YouTube動画一覧 | 劇団四季スケジュール確認アプリ",
};

export default async function YoutubePage() {
  // DBから動画一覧とマスターデータを取得
  const [videos, filterOptions] = await Promise.all([
    fetchVideos({}), // 条件なしで全件取得（最新順）
    fetchFilterOptions(),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">公式YouTube動画一覧</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; トップに戻る
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        劇団四季公式チャンネルの動画一覧です。演目やキャストから見たい動画を検索できます。
        <br />
        <span className="text-xs text-gray-500">※ 動画をクリックするとYouTube公式サイトが新しいタブで開きます。</span>
      </p>

      {/* クライアントコンポーネントにデータを渡して描画 */}
      <YoutubeIndexShell 
        initialVideos={videos} 
        works={filterOptions.works}
        performers={filterOptions.performers}
        theaters={filterOptions.theaters}
      />
    </div>
  );
}
