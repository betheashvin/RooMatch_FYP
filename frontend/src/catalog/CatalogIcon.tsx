import type { ReactNode } from "react";

type IconName = "search" | "filter" | "pin" | "plus" | "arrow" | "chevron" | "close" | "ruler" | "plan" | "room";

const ICONS: Record<IconName, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  ruler: <><path d="m3 16 13-13 5 5L8 21 3 16Z" /><path d="m7 12 2 2m1-5 3 3m0-6 2 2m1-5 2 2" /></>,
  plan: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 10h7V3m0 7v5H3m7 6v-3m5 3v-7h6m-6-6V3m0 5h6M6 5v2m12 9v2" /><path d="M10 10h3m2 1v3" /></>,
  room: <><path d="M3 13V9a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4M2 13h3v4h12v-4h3v7H2v-7Zm2 7v2m14-2v2M10 7v10M18 7V3m-2 0h6l-1-3h-4l-1 3M4 7V4m0 1L2 3m2 1 2-2" /></>,
};

export function CatalogIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
