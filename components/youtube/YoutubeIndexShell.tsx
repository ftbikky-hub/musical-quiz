"use client";

import { useState } from "react";
import { YtVideo, YtWork, YtPerformer, ShikiTheater, addPerformerToVideo } from "@/lib/yt-queries";

interface Props {
  initialVideos: YtVideo[];
  works: YtWork[];
  performers: YtPerformer[];
  theaters: ShikiTheater[];
}

export default function YoutubeIndexShell({ initialVideos, works, performers, theaters }: Props) {
  const [videos, setVideos] = useState<YtVideo[]>(initialVideos);
  
  // フィルター用State
  const [selectedWorkId, setSelectedWorkId] = useState<number | "">("");
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // 役者検索用（オートコンプリート）State
  const [selectedPerformerId, setSelectedPerformerId] = useState<number | "">("");
  const [performerInput, setPerformerInput] = useState("");
  const [isPerformerDropdownOpen, setIsPerformerDropdownOpen] = useState(false);

  // 役者追加フォーム用State
  const [addingToVideoId, setAddingToVideoId] = useState<number | null>(null);
  const [newPerformerName, setNewPerformerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // フロントエンド側でのフィルタリング（小規模ならこれで十分高速）
  const filteredVideos = videos.filter((video) => {
    const matchWork = selectedWorkId === "" || video.work_id === Number(selectedWorkId);
    const matchTheater = selectedTheaterId === "" || video.theater_id === selectedTheaterId;
    const matchQuery = searchQuery === "" || video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPerformer = selectedPerformerId === "" || 
      video.yt_video_performers.some(vp => vp.yt_performers?.id === Number(selectedPerformerId));
      
    return matchWork && matchTheater && matchQuery && matchPerformer;
  });

  // 役者追加の処理
  const handleAddPerformer = async (e: React.FormEvent, videoId: number) => {
    e.preventDefault();
    if (!newPerformerName.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      await addPerformerToVideo(videoId, newPerformerName.trim());
      setMessage({ type: 'success', text: '役者を追加しました！再読み込みすると反映されます。' });
      setNewPerformerName("");
      setAddingToVideoId(null);
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'エラーが発生したか、すでに追加済みです。' });
    } finally {
      setIsSubmitting(false);
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
          {/* 演目絞り込み */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">演目</label>
            <select
              className="w-full border-gray-300 rounded-lg p-2 text-sm bg-white"
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">すべての演目</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          
          {/* 役者絞り込み（オートコンプリート） */}
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
                {performers
                  .filter((p) => p.name.includes(performerInput))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                      onClick={() => {
                        setSelectedPerformerId(p.id);
                        setPerformerInput(p.name);
                        setIsPerformerDropdownOpen(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                {performers.filter((p) => p.name.includes(performerInput)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    見つかりません
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 劇場絞り込み */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">劇場</label>
            <select
              className="w-full border-gray-300 rounded-lg p-2 text-sm bg-white"
              value={selectedTheaterId}
              onChange={(e) => setSelectedTheaterId(e.target.value)}
            >
              <option value="">すべての劇場</option>
              {theaters.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
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

      {/* 役者追加時のサジェスト用リスト */}
      <datalist id="performer-datalist">
        {performers.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      {/* 動画リストエリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            {/* サムネイル（公式サイトへのリンク） */}
            <a 
              href={`https://www.youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group aspect-video bg-gray-100"
            >
              {video.thumbnail_url ? (
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
            </a>

            {/* 詳細情報 */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2">
                <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                  {video.title}
                </a>
              </h3>
              
              <div className="text-xs text-gray-500 mb-3">
                公開日: {new Date(video.published_at).toLocaleDateString('ja-JP')}
              </div>

              {/* タグ表示（演目・劇場・役者） */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {video.yt_works && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full">
                    {video.yt_works.name}
                  </span>
                )}
                {video.shiki_theaters && (
                  <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full">
                    {video.shiki_theaters.name}
                  </span>
                )}
                {video.yt_video_performers.map((vp) => vp.yt_performers && (
                  <span key={vp.yt_performers.id} className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] px-2 py-0.5 rounded-full">
                    {vp.yt_performers.name}
                  </span>
                ))}
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
        ))}

        {filteredVideos.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            条件に一致する動画が見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
