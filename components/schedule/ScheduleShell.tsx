"use client";

import { useMemo, useState } from "react";
import type {
  Work,
  Theater,
  ScheduleWithRelations,
  TicketReleaseWithRelations,
} from "@/lib/supabase/types";
import { regionGroupKeyForTheater, type RegionGroupKey } from "@/lib/region-groups";
import FilterBar from "./FilterBar";
import CardGridView from "./CardGridView";
import TimelineView from "./TimelineView";
import MapView from "./MapView";
import TicketReleaseList from "./TicketReleaseList";

type TopTab = "search" | "release";
type ViewMode = "card" | "timeline" | "map";

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: "search", label: "公演スケジュールを探す" },
  { key: "release", label: "チケット発売予定を見る" },
];

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "card", label: "カード", icon: "🗂️" },
  { key: "timeline", label: "タイムライン", icon: "📊" },
  { key: "map", label: "マップ", icon: "🗾" },
];

export default function ScheduleShell({
  works,
  theaters,
  schedules,
  ticketReleases,
}: {
  works: Work[];
  theaters: Theater[];
  schedules: ScheduleWithRelations[];
  ticketReleases: TicketReleaseWithRelations[];
}) {
  const [topTab, setTopTab] = useState<TopTab>("search");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
   const [selectedRegionGroups, setSelectedRegionGroups] = useState<RegionGroupKey[]>([]);
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const regionOk =
        selectedRegionGroups.length === 0 ||
        selectedRegionGroups.includes(
          regionGroupKeyForTheater(s.theater) as RegionGroupKey
        );
      const workOk =
        selectedWorkIds.length === 0 || selectedWorkIds.includes(s.work_id);
      return regionOk && workOk;
    });
  }, [schedules, selectedRegionGroups, selectedWorkIds]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* 目的別の2大タブ */}
      <div className="flex gap-2 border-b border-neutral-200">
        {TOP_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTopTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              topTab === tab.key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {topTab === "search" ? (
        <div className="flex flex-col gap-4">
          <FilterBar
            works={works}
            selectedRegionGroups={selectedRegionGroups}
            onChangeRegionGroups={setSelectedRegionGroups}
            selectedWorkIds={selectedWorkIds}
            onChangeWorkIds={setSelectedWorkIds}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              {filteredSchedules.length} 件表示中（全 {schedules.length} 件）
            </p>

            <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
              {VIEW_MODES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setViewMode(v.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === v.key
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "card" && (
            <CardGridView schedules={filteredSchedules} />
          )}
          {viewMode === "timeline" && (
            <TimelineView schedules={filteredSchedules} works={works} />
          )}
          {viewMode === "map" && (
            <MapView schedules={filteredSchedules} theaters={theaters} />
          )}
        </div>
      ) : (
        <TicketReleaseList ticketReleases={ticketReleases} />
      )}
    </div>
  );
}
