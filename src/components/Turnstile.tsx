import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Cloudflare Turnstile bot check (free CAPTCHA alternative) for the enquiry form.
 * "interaction-only": invisible for most visitors; a small check box appears only when
 * Cloudflare wants an interaction. The token is verified on the server (api/enquiry.ts);
 * nothing here is trusted on its own.
 *
 * Site key: VITE_TURNSTILE_SITE_KEY (public by design). Without it no widget renders
 * and getToken() returns '' (the server then refuses unless Turnstile is disabled there).
 */

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';
/** How long getToken() waits for the check to finish */
const TOKEN_WAIT_MS = 15000;

let loader: Promise<void> | null = null;
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loader = null;
        reject(new Error('Turnstile failed to load'));
      };
      document.head.appendChild(s);
    });
  }
  return loader;
};

export interface TurnstileHandle {
  /** Resolves with a fresh token ('' if none arrived in time or Turnstile isn't set up) */
  getToken: () => Promise<string>;
  /** Tokens work once: call after every submit attempt */
  reset: () => void;
}

export const isTurnstileConfigured = SITE_KEY !== '';

export const Turnstile = forwardRef<TurnstileHandle, { className?: string }>(({ className = '' }, ref) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef('');

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          action: 'enquiry',
          appearance: 'interaction-only',
          size: 'flexible',
          theme: 'light',
          callback: (t: string) => {
            token.current = t;
          },
          'expired-callback': () => {
            token.current = '';
          },
          'error-callback': () => {
            token.current = '';
          },
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      if (!SITE_KEY) return '';
      const start = Date.now();
      while (!token.current && Date.now() - start < TOKEN_WAIT_MS) {
        await new Promise((r) => setTimeout(r, 150));
      }
      return token.current;
    },
    reset: () => {
      token.current = '';
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  if (!SITE_KEY) return null;
  return <div ref={boxRef} className={className} />;
});
Turnstile.displayName = 'Turnstile';
