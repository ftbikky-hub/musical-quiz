import Link from "next/link";
import { PageHeading } from "@/components/theatre/PageHeading";
import styles from "@/components/theatre/theatre.module.css";
import { AutocompleteSearch } from "@/components/archive/AutocompleteSearch";
import { DateJumpForm } from "@/components/archive/DateJumpForm";
import {
  fetchAllArchiveActorOptions,
  fetchAllArchiveStaffOptions,
  fetchAllArchiveRoleOptions,
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
    <div className={`${styles.archiveEntry} border border-gray-200 rounded-xl p-5 space-y-3 bg-white`}>
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
      <PageHeading section="archive" title="舞台の図書室">
        一夜の舞台が、長い物語になる。1954年から続く劇団四季の公演を、作品・人・劇場・日付からひもといて。
      </PageHeading>

      <div className="grid sm:grid-cols-2 gap-4">
        <EntryCard title="作品から、物語をたどる" description="全207作品の公演回数・上演年などを一覧・並べ替え" href="/archive/works" />
        <EntryCard title="劇場から、記憶をたどる" description="全96会場(全国公演を含む)の公演データを一覧・並べ替え" href="/archive/venues" />

        <EntryCard title="舞台を彩った出演者" description="名前の一部を入力すると候補が出ます(芸名・旧名も検索対象)">
          <AutocompleteSearch
            label="出演者名"
            placeholder="例: 市村"
            fetchAllOptions={fetchAllArchiveActorOptions}
          />
        </EntryCard>

        <EntryCard title="舞台を支えた人々" description="名前の一部を入力すると候補が出ます">
          <AutocompleteSearch
            label="スタッフ名"
            placeholder="例: 浅利"
            fetchAllOptions={fetchAllArchiveStaffOptions}
          />
        </EntryCard>

        <EntryCard title="心に残る、あの役" description="役名の一部を入力すると候補が出ます(作品をまたいで検索)">
          <AutocompleteSearch
            label="役名"
            placeholder="例: マリア"
            fetchAllOptions={fetchAllArchiveRoleOptions}
          />
        </EntryCard>

        <EntryCard title="あの日の舞台へ" description="指定した日に上演していた公演期間を表示">
          <DateJumpForm />
        </EntryCard>
      </div>
    </div>
  );
}
