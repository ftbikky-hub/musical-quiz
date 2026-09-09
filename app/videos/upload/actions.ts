"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractDriveFileId } from "@/lib/drive";

export async function addVideo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const driveUrl = String(formData.get("driveUrl") ?? "").trim();

  if (!title || !driveUrl) {
    throw new Error("タイトルとGoogleドライブのリンクは必須です");
  }

  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) {
    throw new Error("Googleドライブの共有リンクを正しく読み取れませんでした");
  }

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }

  const { error } = await supabaseAdmin.from("videos").insert({
    title,
    description: description || null,
    drive_url: driveUrl,
  });

  if (error) {
    throw new Error(`保存に失敗しました: ${error.message}`);
  }

  redirect("/videos");
}
