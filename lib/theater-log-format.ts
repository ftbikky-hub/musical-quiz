/** 前後の空白(半角・全角)を除去する。作品名・劇場名・役名などに使う。 */
export function trimField(value: string): string {
  return value.trim();
}

/**
 * 俳優名の表記ゆれ対策:前後だけでなく、途中の半角・全角スペースもすべて
 * 除去する(「飯田 達郎」と「飯田達郎」が別人として集計されるのを防ぐ)。
 */
export function normalizeActorName(value: string): string {
  return value.replace(/[\s　]/g, "");
}
