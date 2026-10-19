import type { ReactNode } from "react";
import { TheatreIcon } from "./TheatreIcon";
import styles from "./theatre.module.css";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className={styles.emptyState}><TheatreIcon name="book" /><p>{title}</p>{children && <div>{children}</div>}</div>;
}
