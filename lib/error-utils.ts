/**
 * Supabase等から投げられるエラーを、人間が読めるメッセージ文字列に変換する。
 * Error インスタンスとは限らず、{message, code} だけの素のオブジェクトで
 * 投げられることもあるため、その両方に対応する。
 */
export function formatLoadError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === "object") {
    const anyErr = err as { message?: unknown; code?: unknown };
    if (typeof anyErr.message === "string") {
      const code =
        "code" in anyErr && anyErr.code !== undefined
          ? ` (code: ${String(anyErr.code)})`
          : "";
      return `${anyErr.message}${code}`;
    }
    try {
      return `不明なエラー: ${JSON.stringify(err)}`;
    } catch {
      return "不明なエラー";
    }
  }
  return `不明なエラー: ${String(err)}`;
}
