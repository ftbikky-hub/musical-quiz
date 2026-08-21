import type { ScheduleWithRelations } from "@/lib/supabase/types";
import { fmtYMD, scheduleStatus, STATUS_LABEL } from "@/lib/date-utils";
import { readableTextColor } from "@/lib/date-utils";

const STATUS_STYLE: Record<string, string> = {
  running: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-amber-100 text-amber-700",
  ended: "bg-neutral-200 text-neutral-500",
  unknown: "bg-neutral-100 text-neutral-500",
};

export default function CardGridView({
  schedules,
}: {
  schedules: ScheduleWithRelations[];
}) {
  if (schedules.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
        条件に一致する公演が見つかりませんでした。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {schedules.map((s) => {
        const status = scheduleStatus(s.start_date, s.end_date);
        const textColor = readableTextColor(s.work.color_code);
        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            {/* 演目カラー帯：色だけで演目を識別できるようにする */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ backgroundColor: s.work.color_code, color: textColor }}
            >
              <span className="text-sm font-bold">{s.work.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}
                style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-4">
              <p className="text-sm font-bold text-neutral-800">
                {s.theater.name}
              </p>
              <p className="text-xs text-neutral-400">
                {s.theater.region}
                {s.theater.theater_type === "semi_dedicated" && "（準専用）"}
                {s.theater.theater_type === "tour" && "（ツアー）"}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {s.start_confirmed ? fmtYMD(s.start_date) : "日程未定"}
                {" 〜 "}
                {s.end_date
                  ? s.end_confirmed
                    ? fmtYMD(s.end_date)
                    : `${fmtYMD(s.end_date)}（未確定）`
                  : "未定"}
              </p>
              {s.note && (
                <p className="mt-1 text-xs text-neutral-400">{s.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
