"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signup, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/theater-log";
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="max-w-sm mx-auto p-4 sm:p-6 mt-12 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 text-center">新規登録</h1>
      <form
        action={formAction}
        className="space-y-4 bg-white border border-gray-100 rounded-xl p-5"
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</span>
          <input
            name="username"
            required
            autoComplete="username"
            placeholder="半角英数字・3〜20文字"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">パスワード</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="6文字以上"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            パスワード(確認)
          </span>
          <input
            name="passwordConfirm"
            type="password"
            required
            autoComplete="new-password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "登録中..." : "登録する"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        すでにアカウントをお持ちの方は{" "}
        <Link
          href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="text-blue-600 hover:underline"
        >
          ログイン
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
