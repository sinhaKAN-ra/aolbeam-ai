"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { AppearancePicker } from "@/components/appearance/StudyAppearance";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();
  const label = pathname?.startsWith("/chat")
    ? "AI tutor"
    : pathname?.startsWith("/learning-paths")
      ? "Learning paths"
      : pathname?.startsWith("/profile")
        ? "Your account"
        : pathname === "/history"
          ? "Practice history"
          : pathname === "/"
            ? "Study home"
            : "Aolbeam";
  return (
    <header className="workspace-header">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          className="text-muted-foreground"
        >
          <PanelLeft />
        </Button>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-3 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-primary" />A space for your next
          breakthrough
        </span>
        <AppearancePicker />
        <Button asChild variant="outline" size="sm">
          <Link href={user ? "/profile" : "/login"}>
            {user ? "My progress" : "Sign in"}
            <span aria-hidden="true">↗</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
