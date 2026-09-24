const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_DOMAIN = "musical-quiz.local";

/**
 * 観劇記録のログインはユーザー名+パスワードだが、Supabase Auth自体は
 * email/passwordの仕組みを使うため、内部的に仮メールへ変換する。
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "ユーザー名は半角英数字とアンダースコアのみ、3〜20文字で入力してください";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "パスワードは6文字以上で入力してください";
  }
  return null;
}
