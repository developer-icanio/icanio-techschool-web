"use client";

import type { MouseEvent, ReactNode } from "react";

// The desktop dropdowns open on hover and keyboard focus (pure CSS). Next.js
// keeps the header on screen while it swaps the page, so after a click the
// pointer and focus are still on the menu and it would stay open. A click on
// any link closes it: focus is dropped and the item is marked closed until
// the pointer leaves it.
export default function DesktopNav({ children }: { children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLElement>) => {
    const link = (e.target as HTMLElement).closest("a");
    const item = link?.closest<HTMLElement>("[data-nav-item]");
    if (!link || !item) return;
    item.setAttribute("data-closed", "");
    link.blur();
    item.addEventListener("mouseleave", () => item.removeAttribute("data-closed"), { once: true });
  };
  return (
    <nav aria-label="Main" className="hidden lg:block" onClick={onClick}>
      {children}
    </nav>
  );
}
