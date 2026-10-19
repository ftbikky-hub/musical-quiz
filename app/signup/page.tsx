"use client";

import Link from "next/link";
import { PageHeading } from "@/components/theatre/PageHeading";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signup, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/theater-log";
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [name, setName] = useState("");
  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 mt-4 space-y-6">
      <PageHeading section="account" title="観劇手帳に、お名前を。">
        好きな舞台の記憶を、今日から。お名前だけで登録でき、次回からは一覧で選ぶだけです。
      </PageHeading>
      <form action={formAction} onReset={(event) => event.preventDefault()} className="space-y-4 bg-white border border-gray-100 rounded-xl p-5">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {state.error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">{state.error}</p>}
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">お名前</span>
          <input name="username" value={name} onChange={(event) => setName(event.target.value)} required maxLength={20} autoComplete="nickname" placeholder="例：びっきぃ" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </label>
        <p className="text-xs text-gray-500 leading-relaxed">1〜20文字。同じ名前は登録できません。すでに登録済みの方は、下のリンクからお名前を選んでください。</p>
        <button type="submit" disabled={pending} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {pending ? "お名前を登録しています…" : "この名前を登録して入る"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500"><Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-blue-600 hover:underline">登録済みの名前から選ぶ</Link></p>
    </div>
  );
}

export default function SignupPage() { return <Suspense><SignupForm /></Suspense>; }
