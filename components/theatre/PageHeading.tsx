import type { ReactNode } from "react";
import { sections, type SectionId } from "./sections";
import styles from "./theatre.module.css";

export function PageHeading({ section, title, children, actions }: { section: SectionId; title: string; children?: ReactNode; actions?: ReactNode }) {
  const current = sections.find((item) => item.id === section);
  return (
    <header className={styles.pageHeading}>
      <div className={styles.headingCopy}>
        <p className={styles.eyebrow}>{current?.english ?? "YOUR PERSONAL ACCOUNT"}<span>{current?.number ?? "TN"} / THEATRE NOTES</span></p>
        <h1>{title}</h1>
        {children && <div className={styles.headingDescription}>{children}</div>}
      </div>
      {actions && <div className={styles.headingActions}>{actions}</div>}
    </header>
  );
}
