"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="page-shell">
      <nav
        aria-label="Account navigation"
        className="mb-8 flex gap-1 overflow-x-auto border-b"
      >
        {[
          { href: "/profile", title: "Overview" },
          { href: "/profile/history", title: "Saved practice" },
          { href: "/profile/settings", title: "Settings & appearance" },
          { href: "/account/usage", title: "Usage" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 pb-4 pt-2 text-xs font-medium transition-colors ${pathname === item.href ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"}`}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
