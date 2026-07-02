"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/bills", label: "Bills" },
  { href: "/categories", label: "Categories" },
  { href: "/export", label: "Export" },
];

/**
 * Sticky bookcloth-green glass bar: wordmark, primary nav (hidden on
 * mobile — the FAB takes over there), account avatar.
 */
export default function TopBar({ accountInitial }: { accountInitial: string }) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-page/14 bg-banker/86 px-4 text-page shadow-[inset_0_1px_0_rgba(251,246,233,0.10),0_1px_12px_rgba(35,39,31,0.10)] backdrop-blur-[14px] backdrop-saturate-150 md:gap-8 md:px-7"
    >
      <span className="font-display text-[22px] font-extrabold tracking-[0.01em]">sift.</span>
      <nav aria-label="Primary" className="ml-2 hidden gap-1 md:flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? "bg-page/12 text-page" : "text-page/72 hover:text-page"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <span
        aria-label="Account"
        className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-page/35 bg-page/18 text-[13px] font-semibold"
      >
        {accountInitial}
      </span>
    </header>
  );
}
