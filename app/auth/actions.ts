"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  usernameToEmail,
  validateUsername,
  validatePassword,
} from "@/lib/auth-username";

export type AuthFormState = { error: string | null };

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const s = String(value ?? "");
  return s.startsWith("/") ? s : "/theater-log";
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  if (!username || !password) {
    return { error: "ユーザー名とパスワードを入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "ユーザー名またはパスワードが違います" };
  }

  redirect(redirectTo);
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません" };
  }

  if (!supabaseAdmin) {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。",
    };
  }

  const email = usernameToEmail(username);
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already")) {
      return { error: "そのユーザー名は既に使われています" };
    }
    return { error: `登録に失敗しました: ${createError.message}` };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return {
      error: "登録は完了しましたが、ログインに失敗しました。ログイン画面からお試しください",
    };
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
