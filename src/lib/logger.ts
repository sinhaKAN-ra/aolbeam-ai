/*
  Lightweight logger that reduces noise in production. Use logger.debug/info/warn/error.
  Debug logs are shown only in development or when NEXT_PUBLIC_DEBUG === 'true'.
*/

type LogFn = (...args: unknown[]) => void;

const isDebugEnabled =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG === 'true';

const debug: LogFn = (...args) => {
  if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
};

const info: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.info(...args);
};

const warn: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.warn(...args);
};

const error: LogFn = (...args) => {
  // eslint-disable-next-line no-console
  console.error(...args);
};

export const logger = { debug, info, warn, error };


