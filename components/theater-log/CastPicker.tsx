"use client";

import { useEffect, useState } from "react";
import {
  fetchArchiveCastRoles,
  fetchArchiveCastActors,
  searchArchiveCastActors,
  type ArchiveCastRoleOption,
  type ArchiveCastActorOption,
} from "@/app/theater-log/archive-cast-actions";

type CastRowInput = { role_name: string; actor_name: string };

export function CastPicker({
  workTitle,
  addedCasts,
  onAddCasts,
}: {
  workTitle: string;
  addedCasts: CastRowInput[];
  onAddCasts: (rows: CastRowInput[]) => void;
}) {
  const [roles, setRoles] = useState<ArchiveCastRoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [manualRole, setManualRole] = useState("");

  const [candidates, setCandidates] = useState<ArchiveCastActorOption[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [manualActor, setManualActor] = useState("");

  // 作品が変わったら役の選択を、役の選択が変わったらチェック・検索状態をリセットする。
  // (レンダー中に前回値と比較して反映する。Reactの推奨パターン:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevWorkTitle, setPrevWorkTitle] = useState(workTitle);
  if (workTitle !== prevWorkTitle) {
    setPrevWorkTitle(workTitle);
    setSelectedRole(null);
  }

  const [prevSelectedRole, setPrevSelectedRole] = useState(selectedRole);
  if (selectedRole !== prevSelectedRole) {
    setPrevSelectedRole(selectedRole);
    setChecked(new Set());
    setSearchQuery("");
    setSearchResults([]);
  }

  useEffect(() => {
    fetchArchiveCastRoles(workTitle).then(setRoles);
  }, [workTitle]);

  useEffect(() => {
    fetchArchiveCastActors(workTitle, selectedRole ?? "").then(setCandidates);
  }, [workTitle, selectedRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchArchiveCastActors(searchQuery).then(setSearchResults);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function toggle(actor: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(actor)) next.delete(actor);
      else next.add(actor);
      return next;
    });
  }

  function addChecked() {
    if (!selectedRole || checked.size === 0) return;
    onAddCasts([...checked].map((actor_name) => ({ role_name: selectedRole, actor_name })));
    setChecked(new Set());
  }

  function addManualActor() {
    if (!selectedRole || !manualActor.trim()) return;
    onAddCasts([{ role_name: selectedRole, actor_name: manualActor.trim() }]);
    setManualActor("");
  }

  const candidateNames = new Set(candidates.map((c) => c.actor));
  const extraSearchResults = searchResults.filter((a) => !candidateNames.has(a));

  const addedRoleCounts = new Map<string, number>();
  const addedRoleActorKeys = new Set<string>();
  for (const c of addedCasts) {
    addedRoleCounts.set(c.role_name, (addedRoleCounts.get(c.role_name) ?? 0) + 1);
    addedRoleActorKeys.add(`${c.role_name}\u0000${c.actor_name}`);
  }

  if (!workTitle.trim()) {
    return (
      <p className="text-xs text-gray-400">
        作品名を入力すると、アーカイブから役・出演者を選べます
      </p>
    );
  }

  return (
    <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div>
        <span className="block text-xs text-gray-500 mb-1">役を選ぶ</span>
        {roles.length === 0 ? (
          <p className="text-xs text-gray-400 mb-1">
            この作品のアーカイブデータがまだありません(手入力のみ)
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {roles.map((r) => {
              const addedCount = addedRoleCounts.get(r.role) ?? 0;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSelectedRole(r.role)}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    selectedRole === r.role
                      ? "bg-blue-600 text-white border-blue-600"
                      : addedCount > 0
                        ? "bg-gray-100 text-gray-400 border-gray-200"
                        : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {addedCount > 0 && "✓ "}
                  {r.role}
                  {addedCount > 0 && ` (${addedCount}名追加済み)`}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={manualRole}
            onChange={(e) => setManualRole(e.target.value)}
            placeholder="役名を手入力(候補にない場合)"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (manualRole.trim()) {
                setSelectedRole(manualRole.trim());
                setManualRole("");
              }
            }}
            className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs shrink-0"
          >
            この役にする
          </button>
        </div>
      </div>

      {selectedRole && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            「{selectedRole}」の出演者(複数選択可)
          </p>

          {candidates.length === 0 && extraSearchResults.length === 0 && (
            <p className="text-xs text-gray-400">候補がいません。手入力してください</p>
          )}

          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => {
              const alreadyAdded =
                !!selectedRole && addedRoleActorKeys.has(`${selectedRole}\u0000${c.actor}`);
              return (
                <label
                  key={c.actor}
                  className={`flex items-center gap-1 text-xs border rounded-full px-2.5 py-1 ${
                    alreadyAdded
                      ? "bg-gray-100 border-gray-200 text-gray-400"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={alreadyAdded || checked.has(c.actor)}
                    disabled={alreadyAdded}
                    onChange={() => toggle(c.actor)}
                  />
                  {c.actor}
                  <span className="text-gray-400">({c.lastYear}年)</span>
                  {alreadyAdded && <span>追加済み</span>}
                </label>
              );
            })}
            {extraSearchResults.map((actor) => {
              const alreadyAdded =
                !!selectedRole && addedRoleActorKeys.has(`${selectedRole}\u0000${actor}`);
              return (
                <label
                  key={actor}
                  className={`flex items-center gap-1 text-xs border rounded-full px-2.5 py-1 ${
                    alreadyAdded
                      ? "bg-gray-100 border-gray-200 text-gray-400"
                      : "bg-white border-blue-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={alreadyAdded || checked.has(actor)}
                    disabled={alreadyAdded}
                    onChange={() => toggle(actor)}
                  />
                  {actor}
                  {alreadyAdded && <span>追加済み</span>}
                </label>
              );
            })}
          </div>

          <div className="flex gap-1.5">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前の一部で検索"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={addChecked}
              disabled={checked.size === 0}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs disabled:opacity-40 shrink-0"
            >
              選んだ人を追加
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              value={manualActor}
              onChange={(e) => setManualActor(e.target.value)}
              placeholder="俳優名を手入力(候補にない場合)"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={addManualActor}
              disabled={!manualActor.trim()}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg text-xs disabled:opacity-40 shrink-0"
            >
              追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
