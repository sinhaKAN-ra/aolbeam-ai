"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const NavigationContext = createContext({ start: (_href: string) => {} });

export function useNavigationProgress() {
  return useContext(NavigationContext);
}

function CompletionObserver({ finish }: { finish: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const route = `${pathname}?${search?.toString() || ""}`;
  useEffect(() => {
    finish();
  }, [route, finish]);
  return null;
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const committedRoute = useRef("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    committedRoute.current = window.location.pathname + window.location.search;
    setPending(false);
  }, []);
  const start = useCallback(
    (href: string) => {
      const destination = new URL(href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname + destination.search ===
          window.location.pathname + window.location.search
      )
        return;
      if (timeout.current) clearTimeout(timeout.current);
      setPending(true);
      // Recover if navigation is cancelled or fails before a route can commit.
      timeout.current = setTimeout(finish, 30000);
    },
    [finish],
  );
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self") ||
        link.dataset.navigationIgnore !== undefined
      )
        return;
      if (link.protocol === "http:" || link.protocol === "https:")
        start(link.href);
    };
    const onPopState = () => {
      if (
        committedRoute.current ===
        window.location.pathname + window.location.search
      )
        return;
      setPending(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(finish, 30000);
    };
    // Capture runs before Next starts fetching a page, including cold dev routes.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", finish);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", finish);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [finish, start]);
  const value = useMemo(() => ({ start }), [start]);
  return (
    <NavigationContext.Provider value={value}>
      <Suspense fallback={null}>
        <CompletionObserver finish={finish} />
      </Suspense>
      {children}
      {pending && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[100]"
        >
          <div className="navigation-track">
            <div className="navigation-bar" />
          </div>
          <div className="absolute left-1/2 top-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-lg">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Opening page…
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  );
}
