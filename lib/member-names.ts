export const JOURNAL_MEMBER_COOKIE = "theatre-journal-member";

/** 表示名は元の表記を保ち、前後の空白と結合文字だけを揃える。 */
export function normalizeMemberName(value: string): string {
  return value.normalize("NFC").trim();
}

/** 全半角・英字の大文字小文字を揃えて、重複する名前を判定する。 */
export function memberNameKey(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function validateMemberName(value: string): string | null {
  const name = normalizeMemberName(value);
  const length = Array.from(name).length;
  if (length < 1 || length > 20 || /[\u0000-\u001f\u007f]/.test(name)) {
    return "お名前は1〜20文字で入力してください";
  }
  return null;
}

export function isMemberId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function journalRedirectTarget(value: unknown): string {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(path)) return "/theater-log";
  const url = new URL(path, "https://theatre.invalid");
  return url.origin === "https://theatre.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/theater-log";
}
