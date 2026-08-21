"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Theater, ScheduleWithRelations, Work } from "@/lib/supabase/types";
import { fmtYMD } from "@/lib/date-utils";

// 日本全体が収まるように初期表示する中心位置とズームレベル。
const JAPAN_CENTER: [number, number] = [36.5, 137.5];
const JAPAN_ZOOM = 5;

// 劇場×演目のペアごとに1本のピンを立てる。同じ劇場・同じ演目の複数公演
// （例：同じツアーで同じ会場に複数回来る場合）は1本のピンにまとめ、
// ポップアップの中に日程を並べて表示する。
type PinGroup = {
  key: string;
  theater: Theater;
  work: Work;
  items: ScheduleWithRelations[];
};

function buildPinGroups(schedules: ScheduleWithRelations[]): PinGroup[] {
  const byKey = new Map<string, PinGroup>();
  for (const s of schedules) {
    if (s.theater.lat == null || s.theater.lng == null) continue;
    const key = `${s.theater_id}__${s.work_id}`;
    if (!byKey.has(key)) {
      byKey.set(key, { key, theater: s.theater, work: s.work, items: [] });
    }
    byKey.get(key)!.items.push(s);
  }
  return Array.from(byKey.values());
}

// 同じ劇場に複数の演目のピンが立つ場合、座標が完全に同じだと重なってしまい
// タップしづらくなるため、円状にごく小さくずらして表示する。
function jitterOffset(index: number, total: number): [number, number] {
  if (total <= 1) return [0, 0];
  const RADIUS_DEG = 0.045; // およそ数百m〜1km程度のずれ
  const angle = (index / total) * Math.PI * 2;
  return [Math.cos(angle) * RADIUS_DEG, Math.sin(angle) * RADIUS_DEG];
}

// 演目カラーをそのまま反映した、しずく型のシンプルなピンアイコンを作る。
// Leaflet標準のマーカー画像はNext.jsのビルドでパスが壊れやすいため使わない。
function makeIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;
      width:22px;height:22px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid #ffffff;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

export default function MapView({
  schedules,
  theaters,
}: {
  schedules: ScheduleWithRelations[];
  theaters: Theater[];
}) {
  const pinGroups = useMemo(() => buildPinGroups(schedules), [schedules]);

  // 同一劇場内のピン同士のずらし量を計算するため、劇場IDごとにまとめてから
  // 表示用の緯度経度（ずらし込み）を確定する。
  const positionedPins = useMemo(() => {
    const byTheater = new Map<string, PinGroup[]>();
    for (const g of pinGroups) {
      const list = byTheater.get(g.theater.id) ?? [];
      list.push(g);
      byTheater.set(g.theater.id, list);
    }
    const result: { group: PinGroup; lat: number; lng: number }[] = [];
    for (const groups of byTheater.values()) {
      groups.forEach((g, i) => {
        const [dLat, dLng] = jitterOffset(i, groups.length);
        result.push({
          group: g,
          lat: g.theater.lat! + dLat,
          lng: g.theater.lng! + dLng,
        });
      });
    }
    return result;
  }, [pinGroups]);

  const theatersWithoutCoords = theaters.filter(
    (t) => t.lat == null || t.lng == null
  );

  return (
    <div className="relative z-0 flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-xl border border-neutral-200"
        style={{ height: "70vh" }}
      >
        <MapContainer
          center={JAPAN_CENTER}
          zoom={JAPAN_ZOOM}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positionedPins.map(({ group, lat, lng }) => (
            <Marker
              key={group.key}
              position={[lat, lng]}
              icon={makeIcon(group.work.color_code)}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <p style={{ fontWeight: 700, marginBottom: 2, fontSize: 13 }}>
                    {group.theater.name}
                  </p>
                  <p style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>
                    {group.theater.region}
                  </p>
                  <p
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#ffffff",
                      backgroundColor: group.work.color_code,
                      marginBottom: 6,
                    }}
                  >
                    {group.work.title}
                  </p>
                  {group.items.map((s) => (
                    <p key={s.id} style={{ fontSize: 11, color: "#444", margin: "2px 0" }}>
                      {s.start_confirmed ? fmtYMD(s.start_date) : "日程未定"}
                      {" 〜 "}
                      {s.end_date
                        ? s.end_confirmed
                          ? fmtYMD(s.end_date)
                          : `${fmtYMD(s.end_date)}（未確定）`
                        : "未定"}
                    </p>
                  ))}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {theatersWithoutCoords.length > 0 && (
        <p className="text-[10px] text-neutral-300">
          位置情報未登録の劇場：
          {theatersWithoutCoords.map((t) => t.name).join("、")}
        </p>
      )}
    </div>
  );
}
