"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findJournalMember, listJournalMembers, selectJournalMember, clearJournalMember } from "@/lib/journal-members";
import { journalRedirectTarget, memberNameKey, normalizeMemberName, validateMemberName } from "@/lib/member-names";

export type AuthFormState = { error: string | null };
const DUPLICATE_NAME = "その名前は登録済みです。名前の一覧から選んでください。";

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const id = String(formData.get("memberId") ?? "");
  let member;
  try {
    member = await findJournalMember(id);
  } catch {
    return { error: "名前を確認できませんでした。時間をおいて、もう一度お試しください。" };
  }
  if (!member) return { error: "登録済みのお名前を選んでください。" };
  await selectJournalMember(member.id);
  redirect(journalRedirectTarget(formData.get("redirectTo")));
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = normalizeMemberName(String(formData.get("username") ?? ""));
  const nameError = validateMemberName(name);
  if (nameError) return { error: nameError };
  if (!supabaseAdmin) return { error: "現在、お名前を登録できません。管理者にお問い合わせください。" };

  try {
    const key = memberNameKey(name);
    const members = await listJournalMembers();
    if (members.some((member) => memberNameKey(member.display_name) === key)) return { error: DUPLICATE_NAME };

    // 既存DBの profiles.id / theater_logs.user_id が auth.users を参照しているため、
    // 新しい名前にも裏側の参照用IDを発行する。ユーザーによるパスワード入力・認証は行わない。
    // 同じ正規化名は必ず同じ内部メールになるため、Authの一意制約が同時登録も防ぐ。
    const email = `journal-${createHash("sha256").update(key).digest("hex").slice(0, 48)}@musical-quiz.local`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      user_metadata: { username: name, name },
    });
    if (error) {
      if (error.code === "email_exists" || error.code === "user_already_exists" || /already|duplicate/i.test(error.message)) return { error: DUPLICATE_NAME };
      return { error: "名前を登録できませんでした。時間をおいて、もう一度お試しください。" };
    }
    if (!data.user) return { error: "名前の登録を確認できませんでした。もう一度お試しください。" };

    const id = data.user.id;
    try {
      // 既存のプロフィール同期トリガーを使用。未設定のDBでも同じIDで補う。
      if (!await findJournalMember(id)) {
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({ id, display_name: name });
        if (profileError) throw profileError;
      }
    } catch (error) {
      // 新規作成分だけを取り消し、選べない名前がAuth側に残ることを防ぐ。
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (rollbackError) return { error: "登録状態を確認できません。管理者にお問い合わせください。" };
      if ((error as { code?: string }).code === "23505") return { error: DUPLICATE_NAME };
      return { error: "名前を登録できませんでした。もう一度お試しください。" };
    }
    await selectJournalMember(id);
  } catch {
    return { error: "名前を登録できませんでした。時間をおいて、もう一度お試しください。" };
  }
  redirect(journalRedirectTarget(formData.get("redirectTo")));
}

export async function logout() {
  await clearJournalMember();
  redirect("/login");
}
