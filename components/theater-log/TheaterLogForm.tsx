"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  createTheaterLog,
  updateTheaterLog,
  fetchAutoCastCandidates,
  searchActorCandidates,
  searchRoleCandidates,
  searchWorkCandidates,
  searchTheaterCandidates,
} from "@/app/theater-log/actions";
import { Autocomplete } from "./Autocomplete";
import { PhotoUploader, type PhotoFormItem } from "./PhotoUploader";
import type {
  AutoCastCandidate,
  PerformanceSlot,
  TheaterLogWithRelations,
} from "@/lib/supabase/types";

type CastRow = { key: string; role_name: string; actor_name: string };

export function TheaterLogForm({
  initialData,
}: {
  initialData?: TheaterLogWithRelations;
}) {
  const isEdit = !!initialData;
  const [id] = useState(() => initialData?.id ?? crypto.randomUUID());

  const [watchedOn, setWatchedOn] = useState(initialData?.watched_on ?? "");
  const [performanceSlot, setPerformanceSlot] = useState<PerformanceSlot | "">(
    initialData?.performance_slot ?? ""
  );
  const [workTitle, setWorkTitle] = useState(initialData?.work_title ?? "");
  const [theater, setTheater] = useState(initialData?.theater ?? "");
  const [seat, setSeat] = useState(initialData?.seat ?? "");
  const [rating, setRating] = useState<number | null>(initialData?.rating ?? null);
  const [impression, setImpression] = useState(initialData?.impression ?? "");

  const [casts, setCasts] = useState<CastRow[]>(() =>
    (initialData?.casts ?? []).map((c) => ({
      key: c.id,
      role_name: c.role_name ?? "",
      actor_name: c.actor_name,
    }))
  );

  const [photos, setPhotos] = useState<PhotoFormItem[]>([]);

  const [autoCandidates, setAutoCandidates] = useState<AutoCastCandidate[]>([]);
  const [autoDismissed, setAutoDismissed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function checkAutoCast(work: string, date: string) {
    setAutoDismissed(false);
    if (!work || !date) {
      setAutoCandidates([]);
      return;
    }
    const results = await fetchAutoCastCandidates(work, date);
    setAutoCandidates(results);
  }

  function applyAutoCast(candidate: AutoCastCandidate) {
    setCasts(
      candidate.casts.map((c) => ({
        key: crypto.randomUUID(),
        role_name: c.role_name,
        actor_name: c.actor_name,
      }))
    );
    setAutoDismissed(true);
  }

  function addCastRow() {
    setCasts((prev) => [
      ...prev,
      { key: crypto.randomUUID(), role_name: "", actor_name: "" },
    ]);
  }
  function removeCastRow(key: string) {
    setCasts((prev) => prev.filter((c) => c.key !== key));
  }
  function updateCastRow(
    key: string,
    field: "role_name" | "actor_name",
    value: string
  ) {
    setCasts((prev) =>
      prev.map((c) => (c.key === key ? { ...c, [field]: value } : c))
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!watchedOn || !workTitle.trim()) {
      setError("観劇日と作品名は必須です");
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setError("写真のアップロード中です。完了してから保存してください");
      return;
    }

    const input = {
      watchedOn,
      performanceSlot,
      workTitle,
      theater,
      seat,
      rating,
      impression,
      casts: casts.map((c) => ({
        role_name: c.role_name,
        actor_name: c.actor_name,
      })),
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          const existingPhotos = photos
            .filter((p) => p.existingId)
            .map((p) => ({
              id: p.existingId!,
              storage_path: p.storagePath,
              caption: p.caption,
            }));
          const newPhotos = photos
            .filter((p) => !p.existingId)
            .map((p) => ({ storage_path: p.storagePath, caption: p.caption }));
          await updateTheaterLog(id, input, existingPhotos, newPhotos);
        } else {
          const newPhotos = photos.map((p) => ({
            storage_path: p.storagePath,
            caption: p.caption,
          }));
          await createTheaterLog(id, input, newPhotos);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">観劇日</span>
          <input
            type="date"
            required
            value={watchedOn}
            onChange={(e) => {
              setWatchedOn(e.target.value);
              checkAutoCast(workTitle, e.target.value);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">公演回</span>
          <select
            value={performanceSlot}
            onChange={(e) =>
              setPerformanceSlot(e.target.value as PerformanceSlot | "")
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">未指定</option>
            <option value="matinee">マチネ</option>
            <option value="soiree">ソワレ</option>
            <option value="other">その他</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium text-gray-700 mb-1">作品名</span>
          <Autocomplete
            value={workTitle}
            onChange={(v) => {
              setWorkTitle(v);
              checkAutoCast(v, watchedOn);
            }}
            fetchCandidates={searchWorkCandidates}
            placeholder="作品名"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">劇場(任意)</span>
          <Autocomplete
            value={theater}
            onChange={setTheater}
            fetchCandidates={searchTheaterCandidates}
            placeholder="劇場名"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">座席(任意)</span>
          <input
            value={seat}
            onChange={(e) => setSeat(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!autoDismissed && autoCandidates.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
          <p className="text-sm text-blue-800">
            この日・作品のキャストが見つかりました。反映しますか?
          </p>
          <div className="flex flex-wrap gap-2">
            {autoCandidates.map((c) => (
              <button
                key={c.performanceId}
                type="button"
                onClick={() => applyAutoCast(c)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs"
              >
                {c.session ? `${c.session}のキャストを反映` : "キャストを反映"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAutoDismissed(true)}
              className="px-3 py-1.5 text-xs text-gray-500"
            >
              今回は使わない
            </button>
          </div>
        </div>
      )}

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">評価</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? null : n)}
              className={`text-2xl ${
                rating && n <= rating ? "text-yellow-400" : "text-gray-300"
              }`}
              aria-label={`評価${n}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium text-gray-700">キャスト</span>
          <button
            type="button"
            onClick={addCastRow}
            className="text-xs text-blue-600 hover:underline"
          >
            + 行を追加
          </button>
        </div>
        <div className="space-y-2">
          {casts.map((c) => (
            <div key={c.key} className="flex gap-2 items-start">
              <div className="w-1/3">
                <Autocomplete
                  value={c.role_name}
                  onChange={(v) => updateCastRow(c.key, "role_name", v)}
                  fetchCandidates={(q) => searchRoleCandidates(workTitle, q)}
                  placeholder="役名"
                />
              </div>
              <div className="flex-1">
                <Autocomplete
                  value={c.actor_name}
                  onChange={(v) => updateCastRow(c.key, "actor_name", v)}
                  fetchCandidates={searchActorCandidates}
                  placeholder="俳優名"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCastRow(c.key)}
                className="text-xs text-red-600 px-2 py-2 shrink-0"
              >
                削除
              </button>
            </div>
          ))}
          {casts.length === 0 && (
            <p className="text-xs text-gray-400">まだキャストがありません</p>
          )}
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">感想(任意)</span>
        <textarea
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          rows={5}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">写真</span>
        <PhotoUploader
          logId={id}
          initialPhotos={(initialData?.photos ?? []).map((p) => ({
            id: p.id,
            storage_path: p.storage_path,
            caption: p.caption ?? "",
          }))}
          onPhotosChange={setPhotos}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
