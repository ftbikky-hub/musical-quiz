import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";
export const metadata: Metadata = { title: "私のこれからの予定 | THEATRE NOTES", robots: { index: false, follow: false } };
export default function PlansLayout({ children }: { children: React.ReactNode }) { return <TheatreShell section="plans">{children}</TheatreShell>; }
