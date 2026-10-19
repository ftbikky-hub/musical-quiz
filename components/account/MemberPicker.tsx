"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, type AuthFormState } from "@/app/auth/actions";
import type { JournalMember } from "@/lib/journal-members";
import styles from "./members.module.css";

const initialState: AuthFormState = { error: null };

export function MemberPicker({ members, currentId, redirectTo, loadError }: {
  members: JournalMember[];
  currentId?: string;
  redirectTo: string;
  loadError: boolean;
}) {
  const [selectedId, setSelectedId] = useState(currentId ?? "");
  const [state, formAction, pending] = useActionState(login, initialState);
  const selectedName = members.find((member) => member.id === selectedId)?.display_name;
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  return (
    <div className="space-y-5">
      {loadError ? <div className={styles.notice} role="alert">
        お名前の一覧を読み込めませんでした。<a href={loginHref}>もう一度読み込む</a>
      </div> : members.length > 0 ? (
        <div className={styles.picker}>
          <fieldset disabled={pending}>
            <legend>登録済みのお名前<span>{members.length} NAMES</span></legend>
            <div className={styles.memberList}>
              {members.map((member) => (
                <label key={member.id} className={`${styles.member} ${selectedId === member.id ? styles.selected : ""}`}>
                  <input type="radio" name="journalMemberChoice" value={member.id} checked={selectedId === member.id} onChange={() => setSelectedId(member.id)} />
                  <span className={styles.initial} aria-hidden="true">{Array.from(member.display_name)[0]}</span>
                  <span className={styles.memberName}>{member.display_name}</span>
                  {member.id === currentId && <span className={styles.current}>選択中</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <form action={formAction}>
            <input type="hidden" name="memberId" value={selectedId} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {state.error && <p id="member-error" className={styles.error} role="alert">{state.error}</p>}
            <button type="submit" disabled={!selectedId || pending} className={styles.submit}>
              {pending ? "手帳を開いています…" : selectedName ? `${selectedName}で入る` : "お名前を選んでください"}
            </button>
            <p className={styles.hint}>パスワードは不要です。選んだ名前で観劇を記録します。</p>
          </form>
        </div>
      ) : <div className={styles.notice}>まだお名前が登録されていません。下の「新しい名前を登録する」から、最初の一人になりましょう。</div>}
      <p className={styles.registerLink}>はじめての方は <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}>新しい名前を登録する <span aria-hidden="true">↗</span></Link></p>
    </div>
  );
}
