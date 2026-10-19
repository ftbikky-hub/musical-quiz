import Link from "next/link";
import type { ArchiveWorkStat } from "@/lib/supabase/types";
import styles from "./library.module.css";

export function WorkBooks({ works }: { works: ArchiveWorkStat[] }) {
  return <div className={styles.books}>
    {works.map((work) => <Link key={work.work_id} href={`/archive/works/${work.work_id}`} className={styles.book} data-tone={work.work_id % 4}>
      <div className={styles.cover}>
        <span className={styles.bookNumber}>THEATRE COLLECTION · {String(work.work_id).padStart(3, "0")}</span>
        <span className={styles.coverOrnament} aria-hidden="true">✧</span>
        <h3>{work.work_name}</h3>
        <span className={styles.coverYear}>{work.first_year} — {work.last_year}</span>
      </div>
      <div className={styles.bookCaption}><span>{work.total_performances.toLocaleString()}回の公演記録</span><span aria-hidden="true">↗</span></div>
    </Link>)}
  </div>;
}
