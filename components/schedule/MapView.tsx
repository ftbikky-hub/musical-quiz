"use client";

import { useMemo, useState } from "react";
import type { Theater, ScheduleWithRelations } from "@/lib/supabase/types";
import { fmtYMD } from "@/lib/date-utils";

const VIEW_W = 520;
const VIEW_H = 620;
const PAD = 40;

// 日本のおおよその範囲（沖縄〜北海道）。簡易マップなので正確な海岸線は描かず、
// 緯度経度から算出した相対位置にピンを打つ模式図とする。
const LAT_MIN = 24;
const LAT_MAX = 45.8;
const LNG_MIN = 122.5;
const LNG_MAX = 145.8;

function project(lat: number, lng: number) {
  const x = PAD + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (VIEW_W - PAD * 2);
  const y =
    PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (VIEW_H - PAD * 2);
  return { x, y };
}

export default function MapView({
  schedules,
  theaters,
}: {
  schedules: ScheduleWithRelations[];
  theaters: Theater[];
}) {
  const [activeTheaterId, setActiveTheaterId] = useState<string | null>(null);

  const pins = useMemo(() => {
    const byTheater = new Map<
      string,
      { theater: Theater; items: ScheduleWithRelations[] }
    >();
    for (const s of schedules) {
      if (s.theater.lat == null || s.theater.lng == null) continue;
      if (!byTheater.has(s.theater_id)) {
        byTheater.set(s.theater_id, { theater: s.theater, items: [] });
      }
      byTheater.get(s.theater_id)!.items.push(s);
    }
    return Array.from(byTheater.values());
  }, [schedules]);

  const activePin = pins.find((p) => p.theater.id === activeTheaterId);
  const theatersWithoutCoords = theaters.filter(
    (t) => t.lat == null || t.lng == null
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-b from-sky-50 to-white">
        <p className="absolute left-3 top-3 z-10 text-[10px] font-bold text-neutral-400">
          簡易マップ（模式図・実際の海岸線とは異なります）
        </p>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="mx-auto block w-full max-w-[420px]"
        >
          {/* 日本列島をイメージした模式的な帯（正確な地図ではない） */}
          <g opacity={0.5}>
            <ellipse
              cx={project(43.5, 142.8).x}
              cy={project(43.5, 142.8).y}
              rx={55}
              ry={45}
              fill="#dbeafe"
            />
            <path
              d={`M ${project(41.5, 141).x} ${project(41.5, 141).y}
                  Q ${project(37, 137).x} ${project(37, 137).y}
                    ${project(34, 135.5).x} ${project(34, 135.5).y}
                  Q ${project(32.5, 132).x} ${project(32.5, 132).y}
                    ${project(31, 130.5).x} ${project(31, 130.5).y}
                  L ${project(30, 131.5).x} ${project(30, 131.5).y}
                  Q ${project(32, 133.5).x} ${project(32, 133.5).y}
                    ${project(33.5, 137).x} ${project(33.5, 137).y}
                  Q ${project(36.5, 139).x} ${project(36.5, 139).y}
                    ${project(41, 143).x} ${project(41, 143).y}
                  Z`}
              fill="#dbeafe"
            />
            <ellipse
              cx={project(26.2, 127.7).x}
              cy={project(26.2, 127.7).y}
              rx={16}
              ry={10}
              fill="#dbeafe"
            />
          </g>

          {pins.map(({ theater, items }) => {
            const { x, y } = project(theater.lat!, theater.lng!);
            const isTour = theater.theater_type === "tour";
            const color = items[0]?.work.color_code ?? "#2c665c";
            const isActive = activeTheaterId === theater.id;
            return (
              <g
                key={theater.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() =>
                  setActiveTheaterId(isActive ? null : theater.id)
                }
              >
                {isActive && (
                  <circle r={14} fill={color} opacity={0.25}>
                    <animate
                      attributeName="r"
                      values="10;16;10"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  r={isTour ? 6 : 8}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {items.length > 1 && (
                  <text
                    y={3}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {items.length}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-full shrink-0 sm:w-64">
        {activePin ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-1 text-xs text-neutral-400">
              {activePin.theater.region}
            </p>
            <p className="mb-3 text-sm font-bold text-neutral-800">
              {activePin.theater.name}
            </p>
            <div className="flex flex-col gap-2">
              {activePin.items.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: s.work.color_code }}
                  />
                  <span className="flex-1 font-bold text-neutral-700">
                    {s.work.title}
                  </span>
                </div>
              ))}
              {activePin.items.map((s) => (
                <p key={`${s.id}-date`} className="text-[11px] text-neutral-400">
                  {fmtYMD(s.start_date)} 〜{" "}
                  {s.end_date ? fmtYMD(s.end_date) : "未定"}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-xs text-neutral-400">
            ピンをタップすると、その劇場の公演詳細が表示されます。
          </div>
        )}

        {theatersWithoutCoords.length > 0 && (
          <p className="mt-3 text-[10px] text-neutral-300">
            位置情報未登録の劇場：
            {theatersWithoutCoords.map((t) => t.name).join("、")}
          </p>
        )}
      </div>
    </div>
  );
}
