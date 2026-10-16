"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { Sidebar } from "@/components/ui/sidebar";
import SidebarContentWrapper from "@/components/SidebarContentWrapper";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname?.startsWith("/chat/");
  const isReading = [
    "/about",
    "/contact-us",
    "/privacy-policy",
    "/terms-of-service",
    "/refund-policy",
    "/auth/error",
  ].includes(pathname || "");
  return (
    <div className="flex min-h-svh w-full">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar collapsible="icon">
        <SidebarContentWrapper />
      </Sidebar>
      <div className="min-w-0 flex-1">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className={
            isChat
              ? "h-[calc(100dvh-4rem)]"
              : `page-enter ${isReading ? "reading-page" : ""}`
          }
        >
          {children}
        </main>
        {!isChat && (
          <footer className="workspace-footer">
            <span>Made for curious minds.</span>
            <div className="flex gap-5">
              <LinkFooter href="/privacy-policy">Privacy</LinkFooter>
              <LinkFooter href="/terms-of-service">Terms</LinkFooter>
              <LinkFooter href="/contact-us">Get in touch ↗</LinkFooter>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
function LinkFooter({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="transition-colors hover:text-primary">
      {children}
    </Link>
  );
}
