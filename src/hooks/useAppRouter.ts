"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/components/NavigationProgress";

/** Programmatic navigation gets the same immediate feedback as a Link click. */
export function useAppRouter() {
  const router = useRouter();
  const { start } = useNavigationProgress();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        start(href);
        router.push(href, options);
      },
      replace: (
        href: string,
        options?: Parameters<typeof router.replace>[1],
      ) => {
        start(href);
        router.replace(href, options);
      },
    }),
    [router, start],
  );
}
