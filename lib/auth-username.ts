// 半角英数字・アンダースコア・ひらがな・カタカナ・漢字を許可(3〜20文字)
const USERNAME_PATTERN = /^[a-zA-Z0-9_぀-ヿ一-鿿]{3,20}$/;
const ASCII_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_DOMAIN = "musical-quiz.local";

/**
 * 観劇記録のログインはユーザー名+パスワードだが、Supabase Auth自体は
 * email/passwordの仕組みを使うため、内部的に仮メールへ変換する。
 * メールのローカル部には非ASCII文字を使えないため、ユーザー名が半角英数字
 * だけの場合はそのまま(既存ユーザーとの互換性のため)、それ以外(漢字・
 * ひらがな・カタカナを含む場合)はUTF-8バイト列を16進数化して埋め込む。
 */
export function usernameToEmail(username: string): string {
  const normalized = username.normalize("NFC");
  const localPart = ASCII_PATTERN.test(normalized)
    ? normalized.toLowerCase()
    : `u-${[...new TextEncoder().encode(normalized)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
  return `${localPart}@${EMAIL_DOMAIN}`;
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username.normalize("NFC"))) {
    return "ユーザー名は半角英数字・アンダースコア・漢字・ひらがな・カタカナのみ、3〜20文字で入力してください";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "パスワードは6文字以上で入力してください";
  }
  return null;
}
