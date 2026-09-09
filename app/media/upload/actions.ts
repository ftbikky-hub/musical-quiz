"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractDriveFileId } from "@/lib/drive";

const VALID_TYPES = ["video", "audio", "photo"] as const;

export async function addMedia(formData: FormData) {
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const driveUrl = String(formData.get("driveUrl") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    throw new Error("種類の指定が正しくありません");
  }
  if (!title || !driveUrl) {
    throw new Error("タイトルとGoogleドライブのリンクは必須です");
  }

  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) {
    throw new Error("Googleドライブの共有リンクを正しく読み取れませんでした");
  }

  if (thumbnailUrl && !extractDriveFileId(thumbnailUrl)) {
    throw new Error("サムネイル画像のリンクを正しく読み取れませんでした");
  }

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }

  const { error } = await supabaseAdmin.from("media").insert({
    type,
    title,
    description: description || null,
    drive_url: driveUrl,
    thumbnail_url: thumbnailUrl || null,
  });

  if (error) {
    throw new Error(`保存に失敗しました: ${error.message}`);
  }

  redirect("/media");
}
