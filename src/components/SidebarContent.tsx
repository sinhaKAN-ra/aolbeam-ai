"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  GraduationCap,
  History,
  LayoutDashboard,
  MessageSquare,
  PanelLeft,
  Route,
  Settings,
  Sprout,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/config/features";

export default function SidebarContent({
  isCollapsed = false,
  onToggleCollapse,
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const nav = [
    {
      href: "/",
      label: "Study home",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/chat/new",
      label: "AI tutor",
      icon: MessageSquare,
      active: pathname?.startsWith("/chat"),
      enabled: FEATURES.chat,
    },
    {
      href: "/#generate",
      label: "Practice studio",
      icon: BookOpen,
      active: false,
      enabled: FEATURES.problemGenerator,
    },
    {
      href: "/learning-paths",
      label: "Learning paths",
      icon: Route,
      active: pathname?.startsWith("/learning-paths"),
      enabled: FEATURES.learningPaths,
    },
    {
      href: "/history",
      label: "Practice history",
      icon: History,
      active: pathname === "/history",
    },
    {
      href: "/tests",
      label: "Practice tests",
      icon: BookOpen,
      active: pathname?.startsWith("/tests"),
      enabled: FEATURES.tests,
    },
    {
      href: "/study-resources",
      label: "Study resources",
      icon: BookOpen,
      active: pathname?.startsWith("/study-resources"),
      enabled: FEATURES.studyResources,
    },
    {
      href: "/blog",
      label: "Learning journal",
      icon: BookOpen,
      active: pathname?.startsWith("/blog"),
      enabled: FEATURES.blog,
    },
  ].filter((item) => item.enabled ?? true);
  const name =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Your study space";
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar px-3 py-5">
      <div
        className={`mb-10 flex h-10 items-center ${isCollapsed ? "justify-center" : "justify-between px-2"}`}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Aolbeam home"
        >
          <span className="brand-mark">
            <GraduationCap className="h-5 w-5" />
          </span>
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-[-0.06em]">
              aolbeam<span className="text-primary">.</span>
            </span>
          )}
        </Link>
        {!isCollapsed && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onToggleCollapse}
            aria-label="Collapse navigation"
          >
            <ChevronLeft />
          </Button>
        )}
      </div>
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="Expand navigation"
          className="mb-4 w-full"
        >
          <PanelLeft />
        </Button>
      )}
      {!isCollapsed && (
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your workspace
        </p>
      )}
      <nav aria-label="Main navigation" className="space-y-1.5">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            aria-current={item.active ? "page" : undefined}
            onClick={() => setOpenMobile(false)}
            className={`nav-item ${item.active ? "nav-item-active" : ""} ${isCollapsed ? "justify-center px-1" : ""}`}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
            {!isCollapsed && item.label === "AI tutor" && (
              <span className="ml-auto text-[9px] font-semibold text-primary">
                AI
              </span>
            )}
          </Link>
        ))}
      </nav>
      {!isCollapsed && (
        <div className="study-note mt-10 p-4">
          <Sprout className="mb-3 h-6 w-6 text-primary" />
          <p className="text-sm font-semibold">A little progress, every day.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Big goals start with one small lesson. Let’s make today count.
          </p>
          <Link
            href="/learning-paths"
            onClick={() => setOpenMobile(false)}
            className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary"
          >
            Find your next step <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      <div className="mt-auto space-y-1 pt-8">
        {!isCollapsed && (
          <div className="mb-5 flex gap-4 px-3 text-xs text-muted-foreground">
            <Link href="/about">About</Link>
            <Link href="/contact-us">Help & contact</Link>
          </div>
        )}
        <Link
          href={user ? "/profile/settings" : "/login"}
          onClick={() => setOpenMobile(false)}
          title={isCollapsed ? "Account settings" : undefined}
          className={`flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3 ${isCollapsed ? "justify-center p-1.5" : ""}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user ? (
              String(name).slice(0, 1).toUpperCase()
            ) : (
              <GraduationCap className="h-4 w-4" />
            )}
          </span>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{name}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {user ? "Manage your account" : "Sign in to save progress"}
                </p>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
