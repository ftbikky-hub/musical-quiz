import type { TicketReleaseWithRelations } from "@/lib/supabase/types";
import { fmtYMD, readableTextColor, todayISO } from "@/lib/date-utils";

export default function TicketReleaseList({
  ticketReleases,
}: {
  ticketReleases: TicketReleaseWithRelations[];
}) {
  const today = todayISO();

  if (ticketReleases.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
        現在登録されているチケット発売予定はありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {ticketReleases.map((t) => {
        const work = t.schedule.work;
        const theater = t.schedule.theater;
        const nextDate = t.general_date ?? t.presale_date;
        const isPast = !!nextDate && nextDate < today;
        const textColor = readableTextColor(work.color_code);

        return (
          <div
            key={t.id}
            className={`flex flex-col gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white sm:flex-row sm:items-stretch ${
              isPast ? "opacity-50" : ""
            }`}
          >
            <div
              className="flex shrink-0 items-center justify-center px-4 py-2 text-sm font-bold sm:w-44"
              style={{ backgroundColor: work.color_code, color: textColor }}
            >
              {work.title}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5">
              <div>
                <p className="text-xs text-neutral-400">
                  {theater.name}（{t.target_period}）
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                  {t.presale_date && (
                    <span className="text-neutral-500">
                      四季の会先行：
                      <span className="font-bold text-neutral-700">
                        {fmtYMD(t.presale_date)}
                      </span>
                    </span>
                  )}
                  {t.general_date && (
                    <span className="text-neutral-500">
                      一般発売：
                      <span className="font-bold text-neutral-700">
                        {fmtYMD(t.general_date)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              {!isPast && nextDate && (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  次の発売日：{fmtYMD(nextDate)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
