"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Rankings" },
  { href: "/trades", label: "Trades" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[rgba(7,8,13,0.8)] backdrop-blur-md">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="german-rail h-6 w-1.5 rounded-full" />
          <span className="font-semibold tracking-tight text-foreground glow-text">
            World Cup <span className="text-blue-bright">Trades</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "text-foreground bg-surface-2 glow-edge-soft"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto text-xs text-muted hidden sm:block">
          FIFA World Cup 2026 · USA · Canada · Mexico
        </div>
      </div>
    </header>
  );
}
