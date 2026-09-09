import { supabase } from "@/lib/supabase/client";
import { extractDriveFileId, driveEmbedUrl } from "@/lib/drive";

export const revalidate = 0; // 常に最新の一覧を取得する

type Video = {
  id: string;
  title: string;
  description: string | null;
  drive_url: string;
  created_at: string;
};

export default async function VideosPage() {
  const { data: videos, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p>動画の取得に失敗しました。</p>;
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>動画一覧</h1>

      {videos?.length === 0 && <p>まだ動画がありません。</p>}

      <div style={{ display: "grid", gap: "2.5rem" }}>
        {videos?.map((video: Video) => {
          const fileId = extractDriveFileId(video.drive_url);
          return (
            <div key={video.id}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{video.title}</h2>
              {video.description && (
                <p style={{ color: "#555", marginBottom: "0.5rem" }}>{video.description}</p>
              )}
              {fileId ? (
                <iframe
                  src={driveEmbedUrl(fileId)}
                  width="100%"
                  height="480"
                  allow="autoplay"
                  style={{ border: 0, borderRadius: 8 }}
                />
              ) : (
                <p style={{ color: "red" }}>動画リンクを読み取れませんでした</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
