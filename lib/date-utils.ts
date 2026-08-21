// 表示用の日付ユーティリティ。DBは date型（YYYY-MM-DD文字列）で保持している前提。

export function todayISO(): string {
  // Vercel(UTC)実行でも日本時間の「今日」に近づけるため+9h補正。
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function fmtYMD(iso: string | null | undefined): string {
  if (!iso) return "未定";
  const [y, m, d] = iso.split("-");
  return `${y}/${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export function fmtMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export type ScheduleStatus = "upcoming" | "running" | "ended" | "unknown";

export function scheduleStatus(
  start: string,
  end: string | null,
  today = todayISO()
): ScheduleStatus {
  if (start > today) return "upcoming";
  if (end && end < today) return "ended";
  return "running";
}

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  upcoming: "上演予定",
  running: "上演中",
  ended: "上演終了",
  unknown: "確認中",
};

/**
 * 16進カラーの明度から、白文字/黒文字どちらが読みやすいかを判定。
 * 演目テーマカラーを背景に使うカード帯・タイムラインバーのラベル色に使う。
 */
export function readableTextColor(hex: string): "#ffffff" | "#111111" {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}
