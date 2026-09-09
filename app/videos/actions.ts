"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteVideo(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("削除対象のIDが指定されていません");
  }

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }

  const { error } = await supabaseAdmin.from("videos").delete().eq("id", id);

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/videos");
}
