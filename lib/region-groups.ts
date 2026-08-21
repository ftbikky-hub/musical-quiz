// 地域フィルター用の大エリア区分（北から南の固定順）。
// 固定劇場の theaters.region はエリア名（東京・舞浜・横浜、名古屋 など）、
// 全国ツアーの theaters.region は都道府県名で入っているため、両方をここで吸収する。
// 全国ツアー（theater_type = 'tour'）は地理的な都道府県に関わらず、
// 常に「全国（全国ツアー）」の1グループとして扱う。

import type { Theater } from "./supabase/types";

export type RegionGroupKey =
  | "hokkaido_tohoku"
  | "kanto"
  | "tokai_koshinetsu"
  | "kansai"
  | "chugoku_shikoku_kyushu_okinawa"
  | "nationwide_tour";

export const REGION_GROUPS: {
  key: RegionGroupKey;
  label: string;
  regions: string[];
}[] = [
  {
    key: "hokkaido_tohoku",
    label: "北海道・東北",
    regions: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  },
  {
    key: "kanto",
    label: "関東（東京・舞浜・横浜など）",
    regions: [
      "茨城県",
      "栃木県",
      "群馬県",
      "埼玉県",
      "千葉県",
      "東京都",
      "神奈川県",
      "東京・舞浜・横浜",
      "横浜",
    ],
  },
  {
    key: "tokai_koshinetsu",
    label: "東海・甲信越（名古屋など）",
    regions: [
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
    ],
  },
  {
    key: "kansai",
    label: "関西",
    regions: [
      "三重県",
      "滋賀県",
      "京都府",
      "京都",
      "大阪府",
      "兵庫県",
      "奈良県",
      "和歌山県",
      "関西",
    ],
  },
  {
    key: "chugoku_shikoku_kyushu_okinawa",
    label: "中国・四国・九州・沖縄",
    regions: [
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
    ],
  },
  {
    key: "nationwide_tour",
    label: "全国（全国ツアー）",
    regions: [],
  },
];

export function regionGroupKeyForTheater(
  theater: Pick<Theater, "region" | "theater_type">
): RegionGroupKey | null {
  if (theater.theater_type === "tour") return "nationwide_tour";
  for (const g of REGION_GROUPS) {
    if (g.key === "nationwide_tour") continue;
    if (g.regions.includes(theater.region)) return g.key;
  }
  return null;
}
