"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { resizeImageToJpeg } from "@/lib/image-resize";
import {
  createSignedUploadUrl,
  deleteStorageObject,
  deleteTheaterLogPhoto,
} from "@/app/theater-log/actions";

const PHOTO_BUCKET = "theater-photos";

export type PhotoFormItem = {
  key: string;
  existingId?: string;
  storagePath: string;
  previewUrl: string;
  caption: string;
  uploading: boolean;
};

function publicUrlFor(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function PhotoUploader({
  logId,
  initialPhotos,
  onPhotosChange,
}: {
  logId: string;
  initialPhotos: { id: string; storage_path: string; caption: string }[];
  onPhotosChange: (items: PhotoFormItem[]) => void;
}) {
  const [items, setItems] = useState<PhotoFormItem[]>(() =>
    initialPhotos.map((p) => ({
      key: p.id,
      existingId: p.id,
      storagePath: p.storage_path,
      previewUrl: publicUrlFor(p.storage_path),
      caption: p.caption,
      uploading: false,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onPhotosChange(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const key = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setItems((prev) => [
        ...prev,
        { key, storagePath: "", previewUrl, caption: "", uploading: true },
      ]);

      try {
        const blob = await resizeImageToJpeg(file);
        const { path, token } = await createSignedUploadUrl(logId, "jpg");
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .uploadToSignedUrl(path, token, blob);
        if (error) throw error;

        setItems((prev) =>
          prev.map((item) =>
            item.key === key ? { ...item, storagePath: path, uploading: false } : item
          )
        );
      } catch (err) {
        alert(`写真のアップロードに失敗しました: ${(err as Error).message}`);
        setItems((prev) => prev.filter((item) => item.key !== key));
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove(item: PhotoFormItem) {
    setItems((prev) => prev.filter((i) => i.key !== item.key));
    if (item.existingId) {
      await deleteTheaterLogPhoto(item.existingId);
    } else if (item.storagePath) {
      await deleteStorageObject(item.storagePath);
    }
  }

  function move(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateCaption(key: string, caption: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, caption } : i)));
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="text-sm"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div
            key={item.key}
            className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt=""
              className="w-full aspect-square object-cover"
            />
            <div className="p-2 space-y-1.5">
              {item.uploading && (
                <p className="text-[11px] text-gray-400">アップロード中...</p>
              )}
              <input
                value={item.caption}
                onChange={(e) => updateCaption(item.key, e.target.value)}
                placeholder="キャプション(任意)"
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-xs text-gray-500 disabled:opacity-30"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="text-xs text-gray-500 disabled:opacity-30"
                  >
                    &rarr;
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="text-xs text-red-600 hover:underline"
                >
                  外す
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
