"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/bills", label: "Bills" },
  { href: "/categories", label: "Categories" },
  { href: "/export", label: "Export" },
];

function NavLinks({ pathname, compact }: { pathname: string; compact: boolean }) {
  return NAV_ITEMS.map((item) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap rounded-lg font-medium ${
          compact ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm"
        } ${active ? "bg-page/12 text-page" : "text-page/72 hover:bg-page/8 hover:text-page"}`}
      >
        {item.label}
      </Link>
    );
  });
}

/**
 * Sticky bookcloth-green glass bar: wordmark, primary nav, account avatar.
 * On mobile the nav moves to a second, horizontally scrollable row so every
 * section stays reachable on a phone.
 */
export default function TopBar({ accountInitial }: { accountInitial: string }) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-10 border-b border-page/14 bg-banker/86 text-page shadow-[inset_0_1px_0_rgba(251,246,233,0.10),0_1px_12px_rgba(35,39,31,0.10)] backdrop-blur-[14px] backdrop-saturate-150"
    >
      <div className="flex h-12 items-center gap-4 px-4 md:h-14 md:gap-8 md:px-7">
        <span className="font-display text-[22px] font-extrabold tracking-[0.01em]">sift.</span>
        <nav aria-label="Primary" className="ml-2 hidden gap-1 md:flex">
          <NavLinks pathname={pathname} compact={false} />
        </nav>
        <span
          aria-label="Account"
          className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-page/35 bg-page/18 text-[13px] font-semibold"
        >
          {accountInitial}
        </span>
      </div>
      <nav
        aria-label="Primary"
        className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
      >
        <NavLinks pathname={pathname} compact />
      </nav>
    </header>
  );
}
