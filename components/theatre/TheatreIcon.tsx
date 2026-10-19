import type { SVGProps } from "react";

export function TheatreIcon({ name = "bell", ...props }: SVGProps<SVGSVGElement> & { name?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {name === "bell" ? <><path d="M6 16h12l-2-3V9a4 4 0 0 0-8 0v4l-2 3Z" /><path d="M10 19a2 2 0 0 0 4 0M12 3v2M4 7l2-2m14 2-2-2" /></> : name === "book" ? <><path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4V4Zm8 1v15M7 8h2m6 0h2M7 12h2m6 0h2" /></> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}
