import Link from "next/link";
import { AutocompleteSearch } from "@/components/archive/AutocompleteSearch";
import { DateJumpForm } from "@/components/archive/DateJumpForm";
import {
  searchArchiveActorOptions,
  searchArchiveStaffOptions,
  searchArchiveRoleOptions,
} from "@/app/archive/queries";

export const revalidate = 0;

function EntryCard({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-blue-600 hover:underline">
            一覧へ &rarr;
          </Link>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
      {children}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        劇団四季公式アーカイブ由来の公演データ(1954年〜)。作品・出演者・役・スタッフ・会場・日付から辿れます。
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <EntryCard title="作品" description="全207作品の公演回数・上演年などを一覧・並べ替え" href="/archive/works" />
        <EntryCard title="会場" description="全96会場(全国公演を含む)の公演データを一覧・並べ替え" href="/archive/venues" />

        <EntryCard title="出演者" description="名前の一部を入力すると候補が出ます(芸名・旧名も検索対象)">
          <AutocompleteSearch
            label="出演者名"
            placeholder="例: 市村"
            searchAction={searchArchiveActorOptions}
          />
        </EntryCard>

        <EntryCard title="スタッフ" description="名前の一部を入力すると候補が出ます">
          <AutocompleteSearch
            label="スタッフ名"
            placeholder="例: 浅利"
            searchAction={searchArchiveStaffOptions}
          />
        </EntryCard>

        <EntryCard title="役" description="役名の一部を入力すると候補が出ます(作品をまたいで検索)">
          <AutocompleteSearch label="役名" placeholder="例: マリア" searchAction={searchArchiveRoleOptions} />
        </EntryCard>

        <EntryCard title="日付から見る" description="指定した日に上演していた公演期間を表示">
          <DateJumpForm />
        </EntryCard>
      </div>
    </div>
  );
}
