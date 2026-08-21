import type { ScheduleWithRelations, Work } from "@/lib/supabase/types";
import { fmtYMD, scheduleStatus, STATUS_LABEL } from "@/lib/date-utils";
import { readableTextColor } from "@/lib/date-utils";

const STATUS_STYLE: Record<string, string> = {
  running: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-amber-100 text-amber-700",
  ended: "bg-neutral-200 text-neutral-500",
  unknown: "bg-neutral-100 text-neutral-500",
};

// 「北から南」の並び順判定用（タイムラインのY軸と同じ並びに揃えている）。
// 固定劇場の region はエリア名（東京・舞浜・横浜、名古屋 など）、
// 全国ツアーの region は都道府県名で入っているため、両方をこの並びに含めている。
const NORTH_TO_SOUTH_ORDER = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "東京・舞浜・横浜",
  "神奈川県",
  "横浜",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "名古屋",
  "三重県",
  "滋賀県",
  "京都府",
  "京都",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "関西",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "広島",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "福岡",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

function regionRank(region: string): number {
  const idx = NORTH_TO_SOUTH_ORDER.indexOf(region);
  return idx === -1 ? 999 : idx;
}

// 全国ツアーカードに表示する会場名は、多すぎると見づらいのでこの件数までに絞る。
const TOUR_VENUE_PREVIEW_MAX = 4;

type DedicatedCardData = {
  kind: "dedicated";
  key: string;
  schedule: ScheduleWithRelations;
};

type TourCardData = {
  kind: "tour";
  key: string;
  work: Work;
  count: number;
  earliestStart: string;
  latestEdge: string;
  venueNames: string[];
  hasMoreVenues: boolean;
};

type CardData = DedicatedCardData | TourCardData;

// theater_type が dedicated / semi_dedicated の公演は今まで通り1件=1枚のカードに、
// tour（全国ツアー）の公演は演目（work_id）ごとに集約して1枚のカードにまとめる。
function buildCards(schedules: ScheduleWithRelations[]): CardData[] {
  const dedicated: DedicatedCardData[] = [];
  const tourByWork = new Map<string, ScheduleWithRelations[]>();

  for (const s of schedules) {
    if (s.theater.theater_type === "tour") {
      const list = tourByWork.get(s.work_id) ?? [];
      list.push(s);
      tourByWork.set(s.work_id, list);
    } else {
      dedicated.push({ kind: "dedicated", key: s.id, schedule: s });
    }
  }

  // 固定劇場カード：タイムラインのY軸と同じ「北から南」の順、
  // 同じ地域内は劇場名・開幕日の順に並べる。
  dedicated.sort((a, b) => {
    const r =
      regionRank(a.schedule.theater.region) -
      regionRank(b.schedule.theater.region);
    if (r !== 0) return r;
    const n = a.schedule.theater.name.localeCompare(
      b.schedule.theater.name,
      "ja"
    );
    if (n !== 0) return n;
    return a.schedule.start_date.localeCompare(b.schedule.start_date);
  });

  const tourCards: TourCardData[] = Array.from(tourByWork.entries()).map(
    ([, items]) => {
      const sorted = [...items].sort((a, b) =>
        a.start_date.localeCompare(b.start_date)
      );

      // ISO形式（YYYY-MM-DD）の日付文字列は、そのまま文字列比較しても
      // 時系列の大小関係と一致するため、Date化せず比較できる。
      const earliestStart = sorted.reduce(
        (min, s) => (s.start_date < min ? s.start_date : min),
        sorted[0].start_date
      );
      const latestEdge = sorted.reduce((max, s) => {
        const edge = s.end_date ?? s.start_date;
        return edge > max ? edge : max;
      }, sorted[0].end_date ?? sorted[0].start_date);

      const uniqueVenues = Array.from(
        new Set(sorted.map((s) => s.theater.name))
      );

      return {
        kind: "tour",
        key: `tour-${sorted[0].work_id}`,
        work: sorted[0].work,
        count: sorted.length,
        earliestStart,
        latestEdge,
        venueNames: uniqueVenues.slice(0, TOUR_VENUE_PREVIEW_MAX),
        hasMoreVenues: uniqueVenues.length > TOUR_VENUE_PREVIEW_MAX,
      };
    }
  );

  // 全国ツアーカードは演目の並び順（sort_order）に揃える。
  tourCards.sort((a, b) => a.work.sort_order - b.work.sort_order);

  return [...dedicated, ...tourCards];
}

function DedicatedCard({ schedule: s }: { schedule: ScheduleWithRelations }) {
  const status = scheduleStatus(s.start_date, s.end_date);
  const textColor = readableTextColor(s.work.color_code);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
}

function TourCard({ card }: { card: TourCardData }) {
  const status = scheduleStatus(card.earliestStart, card.latestEdge);
  const textColor = readableTextColor(card.work.color_code);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* 演目カラー帯：色だけで演目を識別できるようにする */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: card.work.color_code, color: textColor }}
      >
        <span className="text-sm font-bold">{card.work.title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}
          style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-sm font-bold text-neutral-800">
          全国ツアー（複数会場を巡回）
        </p>
        <p className="text-xs text-neutral-400">全国</p>
        <p className="mt-1 text-sm text-neutral-600">
          {fmtYMD(card.earliestStart)} 〜 {fmtYMD(card.latestEdge)}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          全{card.count}公演／
          {card.venueNames.join("、")}
          {card.hasMoreVenues && " など"}
        </p>
        <p className="mt-1 text-[11px] text-neutral-400">
          ※詳細はタイムラインまたはマップでご確認ください。
        </p>
      </div>
    </div>
  );
}

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

  const cards = buildCards(schedules);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) =>
        card.kind === "dedicated" ? (
          <DedicatedCard key={card.key} schedule={card.schedule} />
        ) : (
          <TourCard key={card.key} card={card} />
        )
      )}
    </div>
  );
}
