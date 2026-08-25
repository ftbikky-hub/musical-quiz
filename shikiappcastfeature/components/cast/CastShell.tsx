"use client";

import { useState } from "react";
import type {
  Work,
  Theater,
  CastRole,
  CastPerformer,
  CastPerformanceWithRelations,
} from "@/lib/supabase/types";
import SearchPinTab from "./SearchPinTab";
import CoAppearanceRankingTab from "./CoAppearanceRankingTab";
import TheaterBreakdownTab from "./TheaterBreakdownTab";
import CoAppearanceCheckTab from "./CoAppearanceCheckTab";

type TabKey = "search" | "ranking" | "theater" | "check";

const TABS: { key: TabKey; label: string }[] = [
  { key: "search", label: "検索・役ピン留め" },
  { key: "ranking", label: "共演ランキング" },
  { key: "theater", label: "劇場ごとの登板数" },
  { key: "check", label: "共演チェック" },
];

export default function CastShell({
  works,
  theaters,
  roles,
  performers,
  performances,
}: {
  works: Work[];
  theaters: Theater[];
  roles: CastRole[];
  performers: CastPerformer[];
  performances: CastPerformanceWithRelations[];
}) {
  const [tab, setTab] = useState<TabKey>("search");

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              tab === t.key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <SearchPinTab
          works={works}
          theaters={theaters}
          roles={roles}
          performances={performances}
        />
      )}
      {tab === "ranking" && (
        <CoAppearanceRankingTab performers={performers} />
      )}
      {tab === "theater" && <TheaterBreakdownTab performers={performers} />}
      {tab === "check" && <CoAppearanceCheckTab performers={performers} />}
    </div>
  );
}
