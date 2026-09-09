"use client";

import { useMemo, useState } from "react";
import {
  YtVideo,
  YtWork,
  YtPerformer,
  ShikiTheater,
  addPerformerToVideo,
  removePerformerFromVideo,
} from "@/lib/yt-queries";

interface Props {
  initialVideos: YtVideo[];
  works: YtWork[];
  performers: YtPerformer[];
  theaters: ShikiTheater[];
}

export default function YoutubeIndexShell({ initialVideos, works, performers, theaters }: Props) {
  const [videos, setVideos] = useState<YtVideo[]>(initialVideos);

  // 演目絞り込み用State（予測検索）
  const [selectedWorkId, setSelectedWorkId] = useState<number | "">("");
  const [workInput, setWorkInput] = useState("");
  const [isWorkDropdownOpen, setIsWorkDropdownOpen] = useState(false);

  // 劇場絞り込み用State（予測検索）
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | "">("");
  const [theaterInput, setTheaterInput] = useState("");
  const [isTheaterDropdownOpen, setIsTheaterDropdownOpen] = useState(false);

  // キーワード検索
  const [searchQuery, setSearchQuery] = useState("");

  // 役者絞り込み用State（予測検索）
  const [selectedPerformerId, setSelectedPerformerId] = useState<number | "">("");
  const [performerInput, setPerformerInput] = useState("");
  const [isPerformerDropdownOpen, setIsPerformerDropdownOpen] = useState(false);

  // 役者追加フォーム用State
  const [addingToVideoId, setAddingToVideoId] = useState<number | null>(null);
  const [newPerformerName, setNewPerformerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 指定した種類の絞り込みだけを除外して動画を判定する（連動する候補リストを作るための共通処理）
  const matchesExcept = (video: YtVideo, except: "work" | "theater" | "performer") => {
    const matchWork =
      except === "work" || selectedWorkId === "" || video.work_id === Number(selectedWorkId);
    const matchTheater =
      except === "theater" || selectedTheaterId === "" || video.theater_id === selectedTheaterId;
    const matchQuery =
      searchQuery === "" || video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPerformer =
      except === "performer" ||
      selectedPerformerId === "" ||
      video.yt_video_performers.some((vp) => vp.yt_performers?.id === Number(selectedPerformerId));
    return matchWork && matchTheater && matchQuery && matchPerformer;
  };

  // 演目・劇場・役者の候補は、他の絞り込み条件に実際に合致する動画に登場するものだけに連動して絞られる
  const availableWorks = useMemo(() => {
    const ids = new Set<number>();
    videos.filter((v) => matchesExcept(v, "work")).forEach((v) => {
      if (v.work_id !== null) ids.add(v.work_id);
    });
    return works.filter((w) => ids.has(w.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, selectedTheaterId, selectedPerformerId, searchQuery, works]);

  const availableTheaters = useMemo(() => {
    const ids = new Set<string>();
    videos.filter((v) => matchesExcept(v, "theater")).forEach((v) => {
      if (v.theater_id !== null) ids.add(v.theater_id);
    });
    return theaters.filter((t) => ids.has(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, selectedWorkId, selectedPerformerId, searchQuery, theaters]);

  const availablePerformers = useMemo(() => {
    const ids = new Set<number>();
    videos.filter((v) => matchesExcept(v, "performer")).forEach((v) => {
      v.yt_video_performers.forEach((vp) => {
        if (vp.yt_performers) ids.add(vp.yt_performers.id);
      });
    });
    return performers.filter((p) => ids.has(p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, selectedWorkId, selectedTheaterId, searchQuery, performers]);

  // 一覧表示用：すべての絞り込み条件を適用
  const filteredVideos = videos.filter((video) => {
    const matchWork = selectedWorkId === "" || video.work_id === Number(selectedWorkId);
    const matchTheater = selectedTheaterId === "" || video.theater_id === selectedTheaterId;
    const matchQuery = searchQuery === "" || video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPerformer =
      selectedPerformerId === "" ||
      video.yt_video_performers.some((vp) => vp.yt_performers?.id === Number(selectedPerformerId));

    return matchWork && matchTheater && matchQuery && matchPerformer;
  });

  // カード上のタグをクリックしたら、そのまま検索欄に反映して絞り込む
  const filterByWork = (workId: number, name: string) => {
    setSelectedWorkId(workId);
    setWorkInput(name);
    setIsWorkDropdownOpen(false);
  };

  const filterByTheater = (theaterId: string, name: string) => {
    setSelectedTheaterId(theaterId);
    setTheaterInput(name);
    setIsTheaterDropdownOpen(false);
  };

  const filterByPerformer = (performerId: number, name: string) => {
    setSelectedPerformerId(performerId);
    setPerformerInput(name);
    setIsPerformerDropdownOpen(false);
  };

  // 役者追加の処理
  const handleAddPerformer = async (e: React.FormEvent, videoId: number) => {
    e.preventDefault();
    if (!newPerformerName.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const performer = await addPerformerToVideo(videoId, newPerformerName.trim());
      // 一覧を再取得しなくてもすぐ画面に反映されるよう、その場でstateを更新する。
      setVideos((prev) =>
        prev.map((v) =>
          v.id !== videoId
            ? v
            : {
                ...v,
                yt_video_performers: [
                  ...v.yt_video_performers,
                  { yt_performers: performer },
                ],
              }
        )
      );
      setMessage({ type: "success", text: "役者を追加しました。" });
      setNewPerformerName("");
      setAddingToVideoId(null);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "エラーが発生したか、すでに追加済みです。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // タグ削除の処理（間違って登録したタグを消せるように）
  const handleRemovePerformer = async (videoId: number, performerId: number) => {
    const key = `${videoId}-${performerId}`;
    setRemovingKey(key);
    setMessage(null);

    try {
      await removePerformerFromVideo(videoId, performerId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id !== videoId
            ? v
            : {
                ...v,
                yt_video_performers: v.yt_video_performers.filter(
                  (vp) => vp.yt_performers?.id !== performerId
                ),
              }
        )
      );
      setMessage({ type: "success", text: "タグを削除しました。" });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "削除に失敗しました。" });
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 検索・絞り込みエリア */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">動画を検索</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">タイトル検索</label>
            <input
              type="text"
              placeholder="キーワード..."
              className="w-full border-gray-300 rounded-lg p-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 演目絞り込み（予測検索） */}
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">演目（予測検索）</label>
            <div className="relative">
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white pr-8"
                placeholder="演目名を入力..."
                value={workInput}
                onChange={(e) => {
                  setWorkInput(e.target.value);
                  setIsWorkDropdownOpen(true);
                  if (e.target.value === "") {
                    setSelectedWorkId("");
                  }
                }}
                onFocus={() => setIsWorkDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsWorkDropdownOpen(false), 200)}
              />
              {workInput && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setWorkInput("");
                    setSelectedWorkId("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {isWorkDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {availableWorks
                  .filter((w) => w.name.includes(workInput))
                  .map((w) => (
                    <div
                      key={w.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                      onClick={() => filterByWork(w.id, w.name)}
                    >
                      {w.name}
                    </div>
                  ))}
                {availableWorks.filter((w) => w.name.includes(workInput)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">見つかりません</div>
                )}
              </div>
            )}
          </div>

          {/* 役者絞り込み（予測検索） */}
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">役者名（予測検索）</label>
            <div className="relative">
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white pr-8"
                placeholder="役者名を入力..."
                value={performerInput}
                onChange={(e) => {
                  setPerformerInput(e.target.value);
                  setIsPerformerDropdownOpen(true);
                  if (e.target.value === "") {
                    setSelectedPerformerId("");
                  }
                }}
                onFocus={() => setIsPerformerDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsPerformerDropdownOpen(false), 200)}
              />
              {performerInput && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPerformerInput("");
                    setSelectedPerformerId("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {isPerformerDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {availablePerformers
                  .filter((p) => p.name.includes(performerInput))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                      onClick={() => filterByPerformer(p.id, p.name)}
                    >
                      {p.name}
                    </div>
                  ))}
                {availablePerformers.filter((p) => p.name.includes(performerInput)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">見つかりません</div>
                )}
              </div>
            )}
          </div>

          {/* 劇場絞り込み（予測検索） */}
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">劇場（予測検索）</label>
            <div className="relative">
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white pr-8"
                placeholder="劇場名を入力..."
                value={theaterInput}
                onChange={(e) => {
                  setTheaterInput(e.target.value);
                  setIsTheaterDropdownOpen(true);
                  if (e.target.value === "") {
                    setSelectedTheaterId("");
                  }
                }}
                onFocus={() => setIsTheaterDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsTheaterDropdownOpen(false), 200)}
              />
              {theaterInput && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTheaterInput("");
                    setSelectedTheaterId("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {isTheaterDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {availableTheaters
                  .filter((t) => t.name.includes(theaterInput))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                      onClick={() => filterByTheater(t.id, t.name)}
                    >
                      {t.name}
                    </div>
                  ))}
                {availableTheaters.filter((t) => t.name.includes(theaterInput)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">見つかりません</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-500">
          該当件数: {filteredVideos.length} 件
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* 役者追加時のサジェスト用リスト（こちらは絞り込みに関係なく、全役者から選べる） */}
      <datalist id="performer-datalist">
        {performers.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      {/* 動画リストエリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => {
          const isRemoved = Boolean(video.removed_at);
          return (
          <div
            key={video.id}
            className={`rounded-xl shadow-sm border overflow-hidden flex flex-col ${
              isRemoved ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-100"
            }`}
          >
            {/* サムネイル（公式サイトへのリンク） */}
            <a
              href={`https://www.youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`block relative group aspect-video bg-gray-100 ${isRemoved ? "grayscale" : ""}`}
            >
              {video.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
              )}
              {/* 再生アイコンオーバーレイ */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center">
                  ▶
                </div>
              </div>
              {isRemoved && (
                <div className="absolute top-2 left-2 bg-gray-700/90 text-white text-[10px] px-2 py-0.5 rounded-full">
                  非公開・削除
                </div>
              )}
            </a>

            {/* 詳細情報 */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className={`font-semibold text-sm line-clamp-2 mb-2 ${isRemoved ? "text-gray-500" : "text-gray-800"}`}>
                <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                  {video.title}
                </a>
              </h3>

              <div className="text-xs text-gray-500 mb-3">
                公開日: {new Date(video.published_at).toLocaleDateString('ja-JP')}
                {isRemoved && <span className="ml-2 text-gray-400">（現在は非公開または削除されています）</span>}
              </div>

              {/* タグ表示（演目・劇場・役者）：クリックすると検索欄に反映されて絞り込まれる */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {video.work_id !== null && video.yt_works && (
                  <button
                    type="button"
                    onClick={() => filterByWork(video.work_id as number, video.yt_works!.name)}
                    className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full hover:bg-blue-100"
                  >
                    {video.yt_works.name}
                  </button>
                )}
                {video.theater_id !== null && video.shiki_theaters && (
                  <button
                    type="button"
                    onClick={() => filterByTheater(video.theater_id as string, video.shiki_theaters!.name)}
                    className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full hover:bg-green-100"
                  >
                    {video.shiki_theaters.name}
                  </button>
                )}
                {video.yt_video_performers.map((vp) => {
                  if (!vp.yt_performers) return null;
                  const performerId = vp.yt_performers.id;
                  const performerName = vp.yt_performers.name;
                  const isRemoving = removingKey === `${video.id}-${performerId}`;
                  return (
                    <span
                      key={performerId}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] px-2 py-0.5 rounded-full"
                    >
                      <button
                        type="button"
                        onClick={() => filterByPerformer(performerId, performerName)}
                        className="hover:underline"
                      >
                        {performerName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePerformer(video.id, performerId)}
                        disabled={isRemoving}
                        title="このタグを削除"
                        className="text-gray-400 hover:text-red-600 font-bold leading-none disabled:opacity-40"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* 役者追加ボタン＆フォーム */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {addingToVideoId === video.id ? (
                  <form onSubmit={(e) => handleAddPerformer(e, video.id)} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="役者名を入力..."
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                      value={newPerformerName}
                      onChange={(e) => setNewPerformerName(e.target.value)}
                      disabled={isSubmitting}
                      list="performer-datalist"
                      required
                    />
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                      追加
                    </button>
                    <button type="button" onClick={() => setAddingToVideoId(null)} className="text-gray-500 px-2 py-1 rounded text-xs hover:bg-gray-100">
                      ｷｬﾝｾﾙ
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingToVideoId(video.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span className="text-lg leading-none">+</span> 役者をタグ付け
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}

        {filteredVideos.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            条件に一致する動画が見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
