import Link from "next/link";
import type { ReactNode } from "react";
import { sections, type SectionId } from "./sections";
import { TheatreIcon } from "./TheatreIcon";
import styles from "./theatre.module.css";

export function TheatreShell({ section, children }: { section: SectionId; children: ReactNode }) {
  const current = sections.find((item) => item.id === section);
  return (
    <div className={styles.shell}>
      <a href="#page-content" className={styles.skipLink}>本文へスキップ</a>
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <Link href="/" className={styles.brand} aria-label="THEATRE NOTES トップページ">
            <span className={styles.brandMark}><TheatreIcon /></span>
            <span>THEATRE NOTES<small>A PERSONAL MUSICAL LIBRARY</small></span>
          </Link>
          <p className={styles.motto}>幕が下りても、物語はつづく。</p>
          <Link href="/" className={styles.homeLink}>扉へ戻る <span aria-hidden="true">↗</span></Link>
        </div>
        <nav className={styles.navigation} aria-label="ミュージカルの書斎">
          <div className={styles.navigationInner}>
            {sections.map((item) => (
              <Link key={item.id} href={item.href} aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.activeNav : undefined}>
                <span>{item.number}</span>{item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div className={styles.breadcrumb} aria-label="現在のセクション">
        <Link href="/">THEATRE NOTES</Link><span aria-hidden="true">/</span><span>{current?.english ?? "YOUR PERSONAL ACCOUNT"}</span>
      </div>
      <div id="page-content" tabIndex={-1} className={styles.content}>{children}</div>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <TheatreIcon /><p>{current?.note ?? "好きな舞台の記憶を、あなたの一冊に。"}</p>
          <Link href="/">THEATRE NOTES <span aria-hidden="true">↗</span></Link>
        </div>
        <p className={styles.disclaimer}>ミュージカルを愛する個人の非公式サイトです。劇団四季および各作品の権利元とは関係ありません。</p>
      </footer>
    </div>
  );
}
