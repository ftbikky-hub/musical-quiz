import Link from "next/link";
import { Suspense } from "react";
import { PageHeading } from "@/components/theatre/PageHeading";
import { LibrarySearch } from "@/components/archive/LibrarySearch";
import { WorkBooks } from "@/components/archive/WorkBooks";
import { DateJumpForm } from "@/components/archive/DateJumpForm";
import { fetchArchiveWorkStats } from "@/app/archive/queries";
import styles from "@/components/archive/library.module.css";

export const revalidate = 0;

async function FeaturedBooks() {
  const works = await fetchArchiveWorkStats().catch(() => null);
  if (!works) return <p className={styles.notice}>作品の本棚を読み込めませんでした。時間をおいて、もう一度お試しください。</p>;
  const favorites = ["ノートルダムの鐘", "オペラ座の怪人", "ウィキッド", "ライオンキング"];
  const selected = favorites.flatMap((name) => works.filter((work) => work.work_name === name));
  const featured = [...selected, ...works.filter((work) => !selected.includes(work))].slice(0, 4);
  return <>
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>FROM THE BOOKSHELF</span><h2>一冊の作品から、舞台の奥へ。</h2></div><Link href="/archive/works">全{works.length}作品の本棚へ ↗</Link></div>
    {featured.length ? <WorkBooks works={featured}/> : <p className={styles.notice}>まだ作品の記録がありません。</p>}
  </>;
}

export default function ArchivePage() {
  return <div>
    <PageHeading section="archive" title="舞台の図書室">
      作品を開き、人をたどり、あの日の劇場へ。劇団四季の公演記録を、気の向くままにひもといて。
    </PageHeading>
    <LibrarySearch/>
    <section className={styles.shelfSection} aria-label="作品の本棚">
      <Suspense fallback={<p className={styles.notice}>本棚を準備しています…</p>}><FeaturedBooks/></Suspense>
    </section>
    <div className={styles.directions}>
      <section className={styles.direction}><h2>あの日の舞台へ。</h2><p>誕生日や思い出の日。その日を含む公演期間の記録を開きます。</p><DateJumpForm/></section>
      <section className={styles.direction}><h2>劇場をめぐる。</h2><p>いつもの劇場から、かつて舞台があった場所まで。会場ごとの作品と公演の歴史をたどれます。</p><Link href="/archive/venues">劇場・会場の一覧へ ↗</Link></section>
    </div>
  </div>;
}
