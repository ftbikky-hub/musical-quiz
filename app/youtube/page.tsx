import { fetchVideos, fetchFilterOptions } from "@/lib/yt-queries";
import YoutubeIndexShell from "@/components/youtube/YoutubeIndexShell";
import { PageHeading } from "@/components/theatre/PageHeading";

// 常に最新のデータを取得する
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "公式映像 | THEATRE NOTES",
};

export default async function YoutubePage() {
  // DBから動画一覧とマスターデータを取得
  const [videos, filterOptions] = await Promise.all([
    fetchVideos({}), // 条件なしで全件取得（最新順）
    fetchFilterOptions(),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <PageHeading section="films" title="映像でふれる、舞台の世界。">
        好きな作品の歌声も、まだ知らない舞台の一場面も。劇団四季の公式YouTube映像を、演目・出演者・劇場から探せます。
        <br />動画はYouTube公式サイトで、新しいタブに開きます。
      </PageHeading>

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
