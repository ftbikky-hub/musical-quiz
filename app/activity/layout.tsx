import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";
export const metadata: Metadata = { title: "行動記録 | THEATRE NOTES", robots: { index: false, follow: false } };
export default function ActivityLayout({ children }: { children: React.ReactNode }) { return <TheatreShell section="activity">{children}</TheatreShell>; }
