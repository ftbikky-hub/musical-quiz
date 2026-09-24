"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/theater-log";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="max-w-sm mx-auto p-4 sm:p-6 mt-12 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 text-center">ログイン</h1>
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">パスワード</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "ログイン中..." : "ログイン"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        アカウントをお持ちでない方は{" "}
        <Link
          href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="text-blue-600 hover:underline"
        >
          新規登録
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
