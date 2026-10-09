/**
 * Feature flags — flip a flag to show/hide a feature across the app.
 *
 * Hiding a feature here removes it from navigation and (via a route guard)
 * blocks direct links to it. The CODE STAYS — we build these out later.
 *
 * Focus right now: AI Chat Tutor + problem generation + math/diagrams.
 */
export const FEATURES = {
  // --- Focus features (visible) ---
  chat: true,
  problemGenerator: true,
  mathDiagrams: true,
  learningPaths: true,

  // --- Hidden for now (build later) ---
  payments: false,
  tests: false,
  testSeries: false,
  blog: false,
  studyResources: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key] === true;
}

/**
 * Route prefixes that belong to a hidden feature. Used by the route guard /
 * middleware to redirect deep links to hidden pages back home.
 */
export const HIDDEN_ROUTE_PREFIXES: string[] = [
  ...(!FEATURES.payments ? ['/pricing', '/checkout', '/trial', '/profile/subscriptions', '/payment', '/subscription'] : []),
  ...(!FEATURES.tests ? ['/tests'] : []),
  ...(!FEATURES.testSeries ? ['/test-series'] : []),
  ...(!FEATURES.blog ? ['/blog', '/admin/blog'] : []),
  ...(!FEATURES.studyResources ? ['/study-resources'] : []),
];

export function isHiddenRoute(pathname: string): boolean {
  return HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}
