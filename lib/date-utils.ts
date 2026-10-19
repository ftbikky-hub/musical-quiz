// 表示用の日付ユーティリティ。DBは date型（YYYY-MM-DD文字列）で保持している前提。

export function fmtYMD(iso: string | null | undefined): string {
  if (!iso) return "未定";
  const [y, m, d] = iso.split("-");
  return `${y}/${parseInt(m, 10)}/${parseInt(d, 10)}`;
}
