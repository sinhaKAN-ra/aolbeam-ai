"use client";

import React, { useEffect } from 'react';

/**
 * Scoped fix for the double-scrollbar bug.
 *
 * Root cause: src/app/layout.tsx sets `<body class="min-h-full overflow-y-auto">`.
 * `min-h-full` lets body grow taller than the viewport, and `overflow-y-auto`
 * means body becomes a SECOND scroll container whenever any descendant's
 * natural content height exceeds the viewport — regardless of height/overflow
 * rules set on nodes further down the tree (ChatInterface's own
 * `overflow-y-auto` region can't stop its ancestor, body, from also scrolling).
 *
 * This is a shared root layout used by every route, so flipping body to
 * `overflow-hidden` globally would silently break natural document scroll on
 * every other page (pricing, blog, learning-paths, etc. all rely on it).
 *
 * Scoped fix: only the chat route toggles `overflow-hidden` on body (and caps
 * its height to 100dvh) for as long as it's mounted, and restores the
 * original inline style on unmount. ChatInterface remains the only element
 * that scrolls while a chat page is open.
 */
export default function ChatSessionLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevHeight = body.style.height;

    body.style.overflow = 'hidden';
    body.style.height = '100dvh';

    return () => {
      body.style.overflow = prevOverflow;
      body.style.height = prevHeight;
    };
  }, []);

  return <>{children}</>;
}
