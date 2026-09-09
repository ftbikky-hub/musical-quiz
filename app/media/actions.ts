"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteMedia(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("削除対象のIDが指定されていません");
  }

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }

  const { error } = await supabaseAdmin.from("media").delete().eq("id", id);

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/media");
}

export async function updateMedia(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id) {
    throw new Error("対象のIDが指定されていません");
  }
  if (!title) {
    throw new Error("タイトルは必須です");
  }

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }

  const { error } = await supabaseAdmin
    .from("media")
    .update({ title, description: description || null })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/media");
  redirect("/media");
}
