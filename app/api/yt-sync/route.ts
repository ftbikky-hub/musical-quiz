import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// APIルートの強制動的レンダリング
export const dynamic = 'force-dynamic';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SHIKI_UPLOADS_PLAYLIST_ID = "UUdWRc7vSTDFSDL-ZT1ktQjA"; // UCをUUに変更

interface PlaylistItemsResponse {
  items?: { snippet?: { resourceId?: { videoId?: string } } }[];
}

interface VideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails?: { high?: { url?: string }; default?: { url?: string } };
}

interface VideosListResponse {
  items?: { id: string; snippet: VideoSnippet }[];
}

export async function GET(request: Request) {
  try {
    // 1. 認証チェック (Cron Secret)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY is not defined");
    }

    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin is not initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
    }

    // 2. YouTube APIで最新の動画一覧を取得（最新50件）
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${SHIKI_UPLOADS_PLAYLIST_ID}&key=${YOUTUBE_API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    if (!playlistRes.ok) throw new Error("Failed to fetch playlist");
    const playlistData = (await playlistRes.json()) as PlaylistItemsResponse;
    const videoIds = (playlistData.items ?? [])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return NextResponse.json({ message: "No videos found in playlist." });
    }

    // 3. 動画の詳細（description含む）を取得
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
    const videosRes = await fetch(videosUrl);
    if (!videosRes.ok) throw new Error("Failed to fetch video details");
    const videosData = (await videosRes.json()) as VideosListResponse;

    // 4. マスタデータの取得 (演目、役者、劇場)
    const [worksRes, performersRes, theatersRes] = await Promise.all([
      supabaseAdmin.from("yt_works").select("id, name").order("name", { ascending: false }), // 長い名前順にしたいが、まずは取得
      supabaseAdmin.from("yt_performers").select("id, name"),
      supabaseAdmin.from("shiki_theaters").select("id, name")
    ]);

    // 文字列長の降順でソート（「オペラ座の怪人」が「オペラ座」より先にマッチするように）
    const works = (worksRes.data || []).sort((a, b) => b.name.length - a.name.length);
    const performers = performersRes.data || [];
    const theaters = (theatersRes.data || []).sort((a, b) => b.name.length - a.name.length);

    let addedCount = 0;
    let performersAddedCount = 0;

    // 5. 各動画を処理してDBへUpsert
    for (const item of videosData.items ?? []) {
      const snippet = item.snippet;
      const title = snippet.title;
      const description = snippet.description ?? "";
      const videoId = item.id;
      
      // 演目の判定
      let matchedWorkId = null;
      for (const work of works) {
        if (title.includes(work.name)) {
          matchedWorkId = work.id;
          break;
        }
      }

      // 劇場の判定
      let matchedTheaterId = null;
      for (const theater of theaters) {
        if (title.includes(theater.name) || description.includes(theater.name)) {
          matchedTheaterId = theater.id;
          break;
        }
      }

      // yt_videosにInsertまたはUpdate
      const { data: savedVideo, error: videoError } = await supabaseAdmin
        .from("yt_videos")
        .upsert({
          video_id: videoId,
          title: title,
          description: description,
          published_at: snippet.publishedAt,
          thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
          work_id: matchedWorkId,
          theater_id: matchedTheaterId
        }, { onConflict: 'video_id' })
        .select("id")
        .single();

      if (videoError) {
        console.error(`Error saving video ${videoId}:`, videoError);
        continue;
      }
      
      addedCount++;

      // 役者の自動抽出と紐付け
      if (savedVideo && description) {
        for (const performer of performers) {
          if (description.includes(performer.name)) {
            const { error: linkError } = await supabaseAdmin
              .from("yt_video_performers")
              .insert({
                video_id: savedVideo.id,
                performer_id: performer.id,
                source: 'auto'
              });
              
            // 23505 は一意制約違反（すでに登録済み）。これは無視してよい
            if (!linkError || linkError.code === '23505') {
               if(!linkError) performersAddedCount++;
            } else {
               console.error(`Error linking performer ${performer.name} to video ${videoId}:`, linkError);
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${addedCount} videos. Added ${performersAddedCount} auto-performer links.` 
    });

  } catch (error) {
    console.error("YouTube Sync Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
