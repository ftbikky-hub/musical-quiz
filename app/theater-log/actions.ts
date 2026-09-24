"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trimField, normalizeActorName } from "@/lib/theater-log-format";
import type { AutoCastCandidate, PerformanceSlot } from "@/lib/supabase/types";

const PHOTO_BUCKET = "theater-photos";
const VALID_SLOTS: PerformanceSlot[] = ["matinee", "soiree", "other"];

function requireAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }
  return supabaseAdmin;
}

/**
 * 手入力された俳優名のうち、cast_performers にまだいない人を登録する。
 * 表記ゆれ(スペース)を吸収するため、既存データも空白除去した上で比較する。
 */
async function ensurePerformersRegistered(actorNames: string[]) {
  const admin = requireAdmin();
  const uniqueNames = [...new Set(actorNames)];
  if (uniqueNames.length === 0) return;

  const { data: existing, error } = await admin
    .from("cast_performers")
    .select("name");
  if (error) throw error;

  const existingNormalized = new Set(
    (existing ?? []).map((p) => normalizeActorName(p.name))
  );
  const toInsert = uniqueNames
    .filter((name) => !existingNormalized.has(normalizeActorName(name)))
    .map((name) => ({ name }));

  if (toInsert.length === 0) return;

  const { error: insertError } = await admin
    .from("cast_performers")
    .upsert(toInsert, { onConflict: "name", ignoreDuplicates: true });
  if (insertError) throw insertError;
}

export type CastInput = { role_name: string; actor_name: string };
export type NewPhotoInput = { storage_path: string; caption: string };
export type ExistingPhotoInput = {
  id: string;
  storage_path: string;
  caption: string;
};

export type TheaterLogInput = {
  watchedOn: string;
  performanceSlot: PerformanceSlot | "";
  workTitle: string;
  theater: string;
  seat: string;
  rating: number | null;
  impression: string;
  casts: CastInput[];
};

function normalizeInput(input: TheaterLogInput) {
  const watchedOn = input.watchedOn;
  const workTitle = trimField(input.workTitle);
  if (!watchedOn) throw new Error("観劇日は必須です");
  if (!workTitle) throw new Error("作品名は必須です");

  const performanceSlot =
    input.performanceSlot && VALID_SLOTS.includes(input.performanceSlot)
      ? input.performanceSlot
      : null;

  const casts = input.casts
    .map((c) => ({
      role_name: trimField(c.role_name) || null,
      actor_name: normalizeActorName(c.actor_name),
    }))
    .filter((c) => c.actor_name.length > 0);

  return {
    watched_on: watchedOn,
    performance_slot: performanceSlot,
    work_title: workTitle,
    theater: trimField(input.theater) || null,
    seat: trimField(input.seat) || null,
    rating: input.rating,
    impression: trimField(input.impression) || null,
    casts,
  };
}

/**
 * 新規登録。id はクライアント側で生成した uuid を使う
 * (写真アップロードの保存先パス `{log_id}/{uuid}.jpg` を、保存前から
 * 確定させておくため)。
 */
export async function createTheaterLog(
  id: string,
  input: TheaterLogInput,
  photos: NewPhotoInput[]
) {
  const admin = requireAdmin();
  const normalized = normalizeInput(input);

  const { error: logError } = await admin.from("theater_logs").insert({
    id,
    watched_on: normalized.watched_on,
    performance_slot: normalized.performance_slot,
    work_title: normalized.work_title,
    theater: normalized.theater,
    seat: normalized.seat,
    rating: normalized.rating,
    impression: normalized.impression,
  });
  if (logError) throw new Error(`保存に失敗しました: ${logError.message}`);

  if (normalized.casts.length > 0) {
    const { error: castError } = await admin.from("theater_log_casts").insert(
      normalized.casts.map((c, i) => ({ ...c, log_id: id, sort_order: i }))
    );
    if (castError) throw new Error(`キャストの保存に失敗しました: ${castError.message}`);
  }

  if (photos.length > 0) {
    const { error: photoError } = await admin.from("theater_log_photos").insert(
      photos.map((p, i) => ({
        log_id: id,
        storage_path: p.storage_path,
        caption: trimField(p.caption) || null,
        sort_order: i,
      }))
    );
    if (photoError) throw new Error(`写真の保存に失敗しました: ${photoError.message}`);
  }

  await ensurePerformersRegistered(normalized.casts.map((c) => c.actor_name));

  revalidatePath("/theater-log");
  redirect(`/theater-log/${id}`);
}

export async function updateTheaterLog(
  id: string,
  input: TheaterLogInput,
  existingPhotos: ExistingPhotoInput[],
  newPhotos: NewPhotoInput[]
) {
  const admin = requireAdmin();
  const normalized = normalizeInput(input);

  const { error: logError } = await admin
    .from("theater_logs")
    .update({
      watched_on: normalized.watched_on,
      performance_slot: normalized.performance_slot,
      work_title: normalized.work_title,
      theater: normalized.theater,
      seat: normalized.seat,
      rating: normalized.rating,
      impression: normalized.impression,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (logError) throw new Error(`更新に失敗しました: ${logError.message}`);

  const { error: deleteCastsError } = await admin
    .from("theater_log_casts")
    .delete()
    .eq("log_id", id);
  if (deleteCastsError) {
    throw new Error(`キャストの更新に失敗しました: ${deleteCastsError.message}`);
  }
  if (normalized.casts.length > 0) {
    const { error: castError } = await admin.from("theater_log_casts").insert(
      normalized.casts.map((c, i) => ({ ...c, log_id: id, sort_order: i }))
    );
    if (castError) throw new Error(`キャストの保存に失敗しました: ${castError.message}`);
  }

  let sortOrder = 0;
  for (const photo of existingPhotos) {
    const { error } = await admin
      .from("theater_log_photos")
      .update({ caption: trimField(photo.caption) || null, sort_order: sortOrder })
      .eq("id", photo.id);
    if (error) throw new Error(`写真の更新に失敗しました: ${error.message}`);
    sortOrder += 1;
  }
  if (newPhotos.length > 0) {
    const { error } = await admin.from("theater_log_photos").insert(
      newPhotos.map((p) => ({
        log_id: id,
        storage_path: p.storage_path,
        caption: trimField(p.caption) || null,
        sort_order: sortOrder++,
      }))
    );
    if (error) throw new Error(`写真の保存に失敗しました: ${error.message}`);
  }

  await ensurePerformersRegistered(normalized.casts.map((c) => c.actor_name));

  revalidatePath("/theater-log");
  revalidatePath(`/theater-log/${id}`);
  redirect(`/theater-log/${id}`);
}

export async function deleteTheaterLog(id: string) {
  const admin = requireAdmin();

  const { data: photos, error: fetchError } = await admin
    .from("theater_log_photos")
    .select("storage_path")
    .eq("log_id", id);
  if (fetchError) throw new Error(`削除に失敗しました: ${fetchError.message}`);

  if (photos && photos.length > 0) {
    await admin.storage.from(PHOTO_BUCKET).remove(photos.map((p) => p.storage_path));
  }

  const { error } = await admin.from("theater_logs").delete().eq("id", id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);

  revalidatePath("/theater-log");
  redirect("/theater-log");
}

/** 編集中に既存の写真を1枚外したとき、その場でDB行とStorageの実体を削除する。 */
export async function deleteTheaterLogPhoto(photoId: string) {
  const admin = requireAdmin();

  const { data: photo, error: fetchError } = await admin
    .from("theater_log_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchError) throw new Error(`写真の削除に失敗しました: ${fetchError.message}`);
  if (!photo) return;

  await admin.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);

  const { error } = await admin.from("theater_log_photos").delete().eq("id", photoId);
  if (error) throw new Error(`写真の削除に失敗しました: ${error.message}`);
}

/** アップロード済みだが、記録の保存前に取り消された写真の後始末。 */
export async function deleteStorageObject(path: string) {
  const admin = requireAdmin();
  await admin.storage.from(PHOTO_BUCKET).remove([path]);
}

export async function createSignedUploadUrl(logId: string, ext: string) {
  const admin = requireAdmin();
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const path = `${logId}/${crypto.randomUUID()}.${safeExt}`;

  const { data, error } = await admin.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(`アップロード準備に失敗しました: ${error.message}`);

  return { path, token: data.token };
}

/** 観劇日+作品が既存の公演回と一致する場合、その回のキャストを返す。 */
export async function fetchAutoCastCandidates(
  workTitle: string,
  watchedOn: string
): Promise<AutoCastCandidate[]> {
  const title = trimField(workTitle);
  if (!title || !watchedOn) return [];

  const { data: work } = await supabase
    .from("shiki_works")
    .select("id")
    .eq("title", title)
    .maybeSingle();
  if (!work) return [];

  const { data: performances } = await supabase
    .from("cast_performances")
    .select("id, session")
    .eq("work_id", work.id)
    .eq("performance_date", watchedOn);
  if (!performances || performances.length === 0) return [];

  const results: AutoCastCandidate[] = [];
  for (const performance of performances) {
    const { data: appearances } = await supabase
      .from("cast_appearances")
      .select("role:cast_roles(role_name, sort_order), performer:cast_performers(name), track_no")
      .eq("performance_id", performance.id);

    type AppearanceRow = {
      role: { role_name: string; sort_order: number } | null;
      performer: { name: string } | null;
      track_no: number | null;
    };
    const rows = (appearances ?? []) as unknown as AppearanceRow[];
    const sorted = rows
      .filter((r) => r.role && r.performer)
      .sort((a, b) => {
        const order = (a.role?.sort_order ?? 0) - (b.role?.sort_order ?? 0);
        if (order !== 0) return order;
        return (a.track_no ?? 0) - (b.track_no ?? 0);
      });

    results.push({
      performanceId: performance.id,
      session: performance.session,
      casts: sorted.map((r) => ({
        role_name: r.role!.role_name,
        actor_name: r.performer!.name,
      })),
    });
  }
  return results;
}

export async function searchActorCandidates(query: string): Promise<string[]> {
  const q = trimField(query);
  if (!q) return [];
  const { data } = await supabase
    .from("cast_performers")
    .select("name")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);
  return (data ?? []).map((r) => r.name);
}

export async function searchRoleCandidates(
  workTitle: string,
  query: string
): Promise<string[]> {
  const title = trimField(workTitle);
  const q = trimField(query);
  if (!title) return [];

  const results = new Set<string>();

  const { data: work } = await supabase
    .from("shiki_works")
    .select("id")
    .eq("title", title)
    .maybeSingle();
  if (work) {
    let roleQuery = supabase
      .from("cast_roles")
      .select("role_name")
      .eq("work_id", work.id)
      .order("sort_order");
    if (q) roleQuery = roleQuery.ilike("role_name", `%${q}%`);
    const { data: roles } = await roleQuery.limit(30);
    (roles ?? []).forEach((r) => results.add(r.role_name));
  }

  let pastQuery = supabase
    .from("theater_log_casts")
    .select("role_name, log:theater_logs!inner(work_title)")
    .eq("log.work_title", title)
    .not("role_name", "is", null)
    .limit(50);
  if (q) pastQuery = pastQuery.ilike("role_name", `%${q}%`);
  const { data: pastRoles } = await pastQuery;
  (pastRoles ?? []).forEach((r) => {
    if (r.role_name) results.add(r.role_name);
  });

  return [...results].slice(0, 20);
}

export async function searchWorkCandidates(query: string): Promise<string[]> {
  const q = trimField(query);
  const results = new Set<string>();

  let worksQuery = supabase.from("shiki_works").select("title").order("sort_order");
  if (q) worksQuery = worksQuery.ilike("title", `%${q}%`);
  const { data: works } = await worksQuery.limit(30);
  (works ?? []).forEach((w) => results.add(w.title));

  let pastQuery = supabase.from("theater_logs").select("work_title").limit(100);
  if (q) pastQuery = pastQuery.ilike("work_title", `%${q}%`);
  const { data: pastWorks } = await pastQuery;
  (pastWorks ?? []).forEach((r) => results.add(r.work_title));

  return [...results].slice(0, 20);
}

export async function searchTheaterCandidates(query: string): Promise<string[]> {
  const q = trimField(query);
  const results = new Set<string>();

  let theatersQuery = supabase.from("shiki_theaters").select("name").order("sort_order");
  if (q) theatersQuery = theatersQuery.ilike("name", `%${q}%`);
  const { data: theaters } = await theatersQuery.limit(30);
  (theaters ?? []).forEach((t) => results.add(t.name));

  let pastQuery = supabase
    .from("theater_logs")
    .select("theater")
    .not("theater", "is", null)
    .limit(100);
  if (q) pastQuery = pastQuery.ilike("theater", `%${q}%`);
  const { data: pastTheaters } = await pastQuery;
  (pastTheaters ?? []).forEach((r) => {
    if (r.theater) results.add(r.theater);
  });

  return [...results].slice(0, 20);
}
