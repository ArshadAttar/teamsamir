import { useSyncExternalStore } from 'react';

/**
 * True while the CSS media query matches. During prerender (no window) it returns
 * `serverValue`; the client renders with createRoot (no hydration), so the first
 * client render already uses the real value and nothing flickers.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/** Phones: below Tailwind's `sm` breakpoint (640px) */
export const useIsPhone = () => useMediaQuery('(max-width: 639.98px)');
