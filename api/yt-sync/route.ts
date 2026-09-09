import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// APIルートの強制動的レンダリング
export const dynamic = 'force-dynamic';
// Vercel Hobbyプランで許される最大の処理時間（秒）。
// 過去動画の一括処理（backfill / import-allモード）はこの時間いっぱい使う。
export const maxDuration = 60;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SHIKI_UPLOADS_PLAYLIST_ID = "UUdWRc7vSTDFSDL-ZT1ktQjA"; // UCをUUに変更

// 1回のYouTube API呼び出し・DB処理で扱う動画数（YouTube APIの上限が50件のため）
const BATCH_SIZE = 50;
// backfill / import-allモードで、この時間(ミリ秒)を超えたら処理を打ち切り、続きは次回の呼び出しに回す。
// Vercelの60秒制限に対して余裕を持たせてある。
const TIME_BUDGET_MS = 45_000;

interface PlaylistItemsResponse {
  items?: { snippet?: { resourceId?: { videoId?: string } } }[];
  nextPageToken?: string;
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

interface WorkRow {
  id: number;
  name: string;
}

interface PerformerRow {
  id: number;
  name: string;
}

interface TheaterRow {
  id: string;
  name: string;
}

// タイトル・説明文の中の半角/全角スペースを無視して比較するための正規化。
// 「町 真理子」（マスタ側）と「町真理子」（説明文側）のように、
// 同じ人物・演目でもスペースの有無が食い違っていて一致しないケースがあるため。
const normalize = (s: string) => s.replace(/[\s　]/g, "");

/**
 * 説明文の中の「○○役：氏名」「○○役：氏名Ａ、氏名Ｂ」のようなパターンから
 * 役者名の候補を抜き出す（複数人が「、」「／」「/」「・」区切りで
 * 並んでいる場合もすべて拾う）。
 */
function extractPerformerCandidates(text: string): string[] {
  const candidates: string[] = [];
  // 「役」の後にスペースを挟んで全角/半角コロンが来るパターンも許容する
  const roleSegmentRegex = /役\s*[：:]\s*([^\s　（(\n]{1,40})/g;
  let match: RegExpExecArray | null;
  while ((match = roleSegmentRegex.exec(text)) !== null) {
    const raw = match[1];
    const names = raw
      .split(/[、／/・]/)
      .map((s) => s.trim())
      .filter(Boolean);
    candidates.push(...names);
  }
  return candidates;
}

// 抽出した文字列が「人名らしいか」を簡易的に判定する。
// 文章の続きを誤って拾ってしまうケース（助詞や「です」「ます」を含むなど）を弾く。
function isPlausiblePersonName(name: string): boolean {
  if (name.length < 2 || name.length > 12) return false;
  if (!/^[ぁ-んァ-ヶー一-龠々]+$/.test(name)) return false;
  const filler = ["から", "より", "です", "ます", "こちら", "ください", "という", "こと", "そして"];
  if (filler.some((f) => name.includes(f))) return false;
  return true;
}

/**
 * タイトルから、まだマスタにない演目名の候補を推測する。
 * 「劇団四季：『作品名』」または「劇団四季：作品名：...」の形式のみを対象とする、
 * 控えめな抽出ルール。
 */
function extractWorkCandidate(title: string): string | null {
  const bracketMatch = title.match(/『([^』]{2,20})』/);
  if (bracketMatch) return bracketMatch[1];

  const colonMatch = title.match(/^劇団四季：([^：『』]{2,20})：/);
  if (colonMatch) return colonMatch[1];

  return null;
}

/**
 * 指定したvideoIdの一覧について、YouTubeから詳細（説明文含む）を取得し、
 * yt_videosへ保存、説明文から役者を自動タグ付けする。
 * マスタにまだない演目・役者は、タイトル／説明文から見つかり次第、自動で登録する。
 * works・performersの配列は呼び出し側と共有されるため、新規追加分はその場で反映される。
 * 一度に処理するのは最大50件（YouTube APIの制約）。
 */
async function syncVideoDetails(
  videoIds: string[],
  works: WorkRow[],
  performers: PerformerRow[],
  theaters: TheaterRow[]
): Promise<{ processed: number; performersAdded: number }> {
  if (!supabaseAdmin) {
    throw new Error("supabaseAdmin is not initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (videoIds.length === 0) {
    return { processed: 0, performersAdded: 0 };
  }

  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) throw new Error("Failed to fetch video details");
  const videosData = (await videosRes.json()) as VideosListResponse;

  let processed = 0;
  let performersAdded = 0;

  for (const item of videosData.items ?? []) {
    const snippet = item.snippet;
    const title = snippet.title;
    const description = snippet.description ?? "";
    const videoId = item.id;

    const normalizedTitle = normalize(title);
    const normalizedDescription = normalize(description);

    // 演目の判定
    let matchedWorkId: number | null = null;
    for (const work of works) {
      if (normalizedTitle.includes(normalize(work.name))) {
        matchedWorkId = work.id;
        break;
      }
    }

    // 既存の演目と一致しなかった場合、タイトルから新しい演目名を推測して自動登録する
    if (matchedWorkId === null) {
      const candidateWork = extractWorkCandidate(title);
      if (candidateWork) {
        const normalizedCandidate = normalize(candidateWork);
        const existing = works.find((w) => normalize(w.name) === normalizedCandidate);
        if (existing) {
          matchedWorkId = existing.id;
        } else {
          const { data: newWork, error: newWorkError } = await supabaseAdmin
            .from("yt_works")
            .insert({ name: candidateWork })
            .select("id, name")
            .single();

          if (newWork) {
            works.push(newWork);
            matchedWorkId = newWork.id;
          } else if (newWorkError && newWorkError.code !== "23505") {
            console.error(`Error creating new work ${candidateWork}:`, newWorkError);
          }
        }
      }
    }

    // 劇場の判定
    let matchedTheaterId: string | null = null;
    for (const theater of theaters) {
      const normalizedTheaterName = normalize(theater.name);
      if (normalizedTitle.includes(normalizedTheaterName) || normalizedDescription.includes(normalizedTheaterName)) {
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

    processed++;

    if (savedVideo && description) {
      // 説明文の中に、まだマスタにない役者名らしきものがあれば自動で登録する
      const candidates = extractPerformerCandidates(description);
      for (const candidateRaw of candidates) {
        const candidate = candidateRaw.trim();
        if (!isPlausiblePersonName(candidate)) continue;

        const normalizedCandidate = normalize(candidate);
        const alreadyKnown = performers.some((p) => normalize(p.name) === normalizedCandidate);
        if (alreadyKnown) continue;

        const { data: newPerformer, error: newPerformerError } = await supabaseAdmin
          .from("yt_performers")
          .insert({ name: candidate })
          .select("id, name")
          .single();

        if (newPerformer) {
          performers.push(newPerformer);
        } else if (newPerformerError && newPerformerError.code !== "23505") {
          console.error(`Error creating new performer ${candidate}:`, newPerformerError);
        }
      }

      // 役者の自動抽出と紐付け（マスタは上で追加した分も含む）
      for (const performer of performers) {
        if (normalizedDescription.includes(normalize(performer.name))) {
          const { error: linkError } = await supabaseAdmin
            .from("yt_video_performers")
            .insert({
              video_id: savedVideo.id,
              performer_id: performer.id,
              source: 'auto'
            });

          // 23505 は一意制約違反（すでに登録済み）。これは無視してよい
          if (!linkError) {
            performersAdded++;
          } else if (linkError.code !== '23505') {
            console.error(`Error linking performer ${performer.name} to video ${videoId}:`, linkError);
          }
        }
      }
    }
  }

  return { processed, performersAdded };
}

export async function GET(request: Request) {
  try {
    // 1. 認証チェック (Cron Secret)
    // Vercelの自動更新はAuthorizationヘッダーで送ってくるが、
    // ブラウザでURLを直接開く場合はヘッダーを付けられないので、
    // ?secret=... というURLパラメータでも認証できるようにしている。
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const querySecret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      (Boolean(cronSecret) && querySecret === cronSecret);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY is not defined");
    }

    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin is not initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
    }

    // 2. マスタデータの取得 (演目、役者、劇場)
    const [worksRes, performersRes, theatersRes] = await Promise.all([
      supabaseAdmin.from("yt_works").select("id, name"),
      supabaseAdmin.from("yt_performers").select("id, name"),
      supabaseAdmin.from("shiki_theaters").select("id, name")
    ]);

    // 文字列長の降順でソート（「オペラ座の怪人」が「オペラ座」より先にマッチするように）
    const works = (worksRes.data || []).sort((a, b) => b.name.length - a.name.length);
    const performers = performersRes.data || [];
    const theaters = (theatersRes.data || []).sort((a, b) => b.name.length - a.name.length);

    const mode = searchParams.get("mode");

    if (mode === "backfill") {
      // === 過去動画の一括処理モード ===
      // すでにyt_videosに入っているが説明文が空(NULL)のものを、
      // 制限時間いっぱい繰り返し処理する。1回で終わらなければ
      // 同じURLをもう一度開くことで続きから処理される。
      const startedAt = Date.now();
      let totalProcessed = 0;
      let totalPerformersAdded = 0;

      while (Date.now() - startedAt < TIME_BUDGET_MS) {
        const { data: pendingVideos, error: pendingError } = await supabaseAdmin
          .from("yt_videos")
          .select("video_id")
          .is("description", null)
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (pendingError) {
          throw new Error(`Supabase error (pendingVideos): ${JSON.stringify(pendingError)}`);
        }
        if (!pendingVideos || pendingVideos.length === 0) break;

        const { processed, performersAdded } = await syncVideoDetails(
          pendingVideos.map((v) => v.video_id),
          works,
          performers,
          theaters
        );
        totalProcessed += processed;
        totalPerformersAdded += performersAdded;

        // YouTube APIから返ってきた件数がバッチサイズより少ない＝もう対象がない
        if (processed < pendingVideos.length) break;
      }

      const { count: remaining } = await supabaseAdmin
        .from("yt_videos")
        .select("id", { count: "exact", head: true })
        .is("description", null);

      return NextResponse.json({
        mode: "backfill",
        processedThisRun: totalProcessed,
        performersAddedThisRun: totalPerformersAdded,
        remaining: remaining ?? 0,
        message:
          (remaining ?? 0) > 0
            ? `今回 ${totalProcessed} 件処理しました。残り ${remaining} 件あります。同じURLをもう一度開いてください。`
            : `今回 ${totalProcessed} 件処理しました。すべての動画の説明文が埋まりました。`
      });
    }

    if (mode === "import-all") {
      // === チャンネルの全動画を取り込むモード（過去の900件以上をさかのぼって取得） ===
      // YouTubeのアップロード一覧（プレイリスト）を最初から最後まで、
      // ページ単位（最大50件ずつ）でたどりながら取り込む。
      // 続きの位置は yt_sync_cursor テーブルに保存し、1回で終わらなければ
      // 同じURLをもう一度開くことで続きから処理される。
      const { data: cursorRow, error: cursorReadError } = await supabaseAdmin
        .from("yt_sync_cursor")
        .select("next_page_token, done")
        .eq("id", 1)
        .single();

      if (cursorReadError) {
        throw new Error(`Supabase error (yt_sync_cursor read): ${JSON.stringify(cursorReadError)}`);
      }

      const startedAt = Date.now();
      let pageToken: string | null = cursorRow?.next_page_token ?? null;
      let isDone = cursorRow?.done ?? false;
      let totalProcessed = 0;
      let totalPerformersAdded = 0;
      let pagesProcessed = 0;

      while (!isDone && Date.now() - startedAt < TIME_BUDGET_MS) {
        const playlistUrl =
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${BATCH_SIZE}` +
          `&playlistId=${SHIKI_UPLOADS_PLAYLIST_ID}&key=${YOUTUBE_API_KEY}` +
          (pageToken ? `&pageToken=${pageToken}` : "");

        const playlistRes = await fetch(playlistUrl);
        if (!playlistRes.ok) throw new Error("Failed to fetch playlist page");
        const playlistData = (await playlistRes.json()) as PlaylistItemsResponse;

        const videoIds = (playlistData.items ?? [])
          .map((item) => item.snippet?.resourceId?.videoId)
          .filter((id): id is string => Boolean(id));

        if (videoIds.length > 0) {
          const { processed, performersAdded } = await syncVideoDetails(
            videoIds,
            works,
            performers,
            theaters
          );
          totalProcessed += processed;
          totalPerformersAdded += performersAdded;
        }

        pagesProcessed++;
        pageToken = playlistData.nextPageToken ?? null;
        if (!pageToken) {
          isDone = true;
        }
      }

      const { error: cursorWriteError } = await supabaseAdmin
        .from("yt_sync_cursor")
        .update({
          next_page_token: pageToken,
          done: isDone,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1);

      if (cursorWriteError) {
        console.error("Error saving yt_sync_cursor:", cursorWriteError);
      }

      const { count: totalVideos } = await supabaseAdmin
        .from("yt_videos")
        .select("id", { count: "exact", head: true });

      return NextResponse.json({
        mode: "import-all",
        pagesProcessedThisRun: pagesProcessed,
        processedThisRun: totalProcessed,
        performersAddedThisRun: totalPerformersAdded,
        done: isDone,
        totalVideosInDatabase: totalVideos ?? 0,
        message: isDone
          ? `今回 ${totalProcessed} 件処理しました。チャンネルの全動画を取り込み終わりました（データベース内合計 ${totalVideos ?? 0} 件）。`
          : `今回 ${totalProcessed} 件処理しました（${pagesProcessed}ページ分）。まだ続きがあります。同じURLをもう一度開いてください。`
      });
    }

    // === 通常モード（毎日の自動更新）===
    // YouTube APIで最新の動画一覧を取得（最新50件）
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${BATCH_SIZE}&playlistId=${SHIKI_UPLOADS_PLAYLIST_ID}&key=${YOUTUBE_API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    if (!playlistRes.ok) throw new Error("Failed to fetch playlist");
    const playlistData = (await playlistRes.json()) as PlaylistItemsResponse;
    const videoIds = (playlistData.items ?? [])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return NextResponse.json({ message: "No videos found in playlist." });
    }

    const { processed, performersAdded } = await syncVideoDetails(
      videoIds,
      works,
      performers,
      theaters
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} videos. Added ${performersAdded} auto-performer links.`
    });

  } catch (error) {
    console.error("YouTube Sync Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
