import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Phone carousel: one item at a time, centered, full width (with a 1rem gutter).
 * Swipe with native scroll-snap (one item per swipe); previous / next buttons and dots
 * (or a "3 / 13" counter when there are many items) sit below. Used for the review,
 * video and before & after galleries on screens narrower than 640px; wider screens keep
 * their multi-card strips.
 *
 * `loop`: the last item is followed by the first one (and the first preceded by the last),
 * so the carousel keeps moving in the same direction instead of rewinding. A copy of the
 * last item sits before the first and a copy of the first after the last; when the
 * carousel settles on a copy it jumps, without animation, to the real item.
 */
interface SnapCarouselProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  /** Accessible name of the carousel */
  label: string;
  /** Move to the next item every this many ms (0 = never). Stops while touched or `paused`. */
  autoAdvanceMs?: number;
  /** Stop auto-advancing (e.g. while a review is expanded) */
  paused?: boolean;
  /** Size the carousel to the current item, so a short item leaves no empty space */
  adaptiveHeight?: boolean;
  /** Endless: after the last item comes the first again (and before the first, the last) */
  loop?: boolean;
  /** Called when the visible item changes */
  onActiveChange?: (index: number) => void;
  className?: string;
}

/** Above this many items the dots become a counter */
const MAX_DOTS = 8;
/** After a swipe or tap, wait this long before auto-advancing again */
const RESUME_AFTER_MS = 6000;
/** Scrolling is treated as finished after this long without a scroll event */
const SETTLE_MS = 140;

const NAV_BUTTON =
  'w-11 h-11 shrink-0 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.07] backdrop-blur-md text-white transition-colors active:scale-95 hover:bg-[#1769FF] hover:border-[#1769FF] disabled:opacity-30 disabled:pointer-events-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3FF]';

export function SnapCarousel<T>({
  items,
  getKey,
  renderItem,
  label,
  autoAdvanceMs = 0,
  paused = false,
  adaptiveHeight = false,
  loop = false,
  onActiveChange,
  className = '',
}: SnapCarouselProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const count = items.length;
  const looping = loop && count > 1;
  /** Index of the first real item among the slides (1 when a copy of the last item comes first) */
  const offset = looping ? 1 : 0;
  const slideCount = count + 2 * offset;

  // `slide` is the position among all slides (copies included); `active` is the real item
  const [slide, setSlide] = useState(offset);
  const active = looping ? (((slide - offset) % count) + count) % count : slide;
  const [height, setHeight] = useState<number | undefined>(undefined);
  const lastTouch = useRef(0);
  const touching = useRef(false);

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  /** Scroll to a slide position (copies included) */
  const goToSlide = useCallback((index: number, instant = false) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: instant || reducedMotion() ? 'auto' : 'smooth' });
  }, []);

  // Start on the first real item (past the leading copy)
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && offset) el.scrollLeft = offset * el.clientWidth;
  }, [offset]);

  // Track which slide is centered; once scrolling stops on a copy, jump to the real item
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let settleTimer = 0;
    const settle = () => {
      if (touching.current) {
        settleTimer = window.setTimeout(settle, SETTLE_MS);
        return;
      }
      const w = el.clientWidth;
      if (!looping || w <= 0) return;
      const index = Math.round(el.scrollLeft / w);
      if (index <= 0) el.scrollTo({ left: count * w, behavior: 'auto' });
      else if (index >= count + 1) el.scrollTo({ left: w, behavior: 'auto' });
    };
    const onScroll = () => {
      const w = el.clientWidth;
      if (w > 0) setSlide(Math.max(0, Math.min(slideCount - 1, Math.round(el.scrollLeft / w))));
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE_MS);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(settleTimer);
    };
  }, [count, slideCount, looping]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Keep the same slide in view when the screen is rotated / resized
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let w = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth;
        el.scrollTo({ left: slide * w, behavior: 'auto' });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [slide]);

  // Adaptive height: follow the centered slide's height (also when it expands / collapses)
  useLayoutEffect(() => {
    if (!adaptiveHeight) return;
    const el = scrollerRef.current?.children[slide] as HTMLElement | undefined;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [slide, adaptiveHeight]);

  // Auto-advance while on screen and left alone
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !autoAdvanceMs || paused || count < 2 || reducedMotion()) return;
    let onScreen = false;
    const observer = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    const timer = setInterval(() => {
      if (!onScreen || document.hidden || el.contains(document.activeElement)) return;
      if (performance.now() - lastTouch.current < RESUME_AFTER_MS) return;
      const w = el.clientWidth;
      const current = w > 0 ? Math.round(el.scrollLeft / w) : offset;
      if (looping) goToSlide(Math.min(current + 1, count + 1));
      else goToSlide(current + 1 >= count ? 0 : current + 1);
    }, autoAdvanceMs);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [autoAdvanceMs, paused, count, looping, offset, goToSlide]);

  const touched = () => {
    lastTouch.current = performance.now();
  };

  const step = (dir: 1 | -1) => {
    touched();
    if (looping) goToSlide(Math.max(0, Math.min(count + 1, slide + dir)));
    else goToSlide(Math.max(0, Math.min(count - 1, slide + dir)));
  };

  // Slides: [copy of last, ...items, copy of first] when looping
  const slides: { item: T; index: number; key: string }[] = items.map((item, i) => ({
    item,
    index: i,
    key: getKey(item, i),
  }));
  if (looping) {
    slides.unshift({ item: items[count - 1], index: count - 1, key: `loop-start-${getKey(items[count - 1], count - 1)}` });
    slides.push({ item: items[0], index: 0, key: `loop-end-${getKey(items[0], 0)}` });
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={`w-full ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
      }}
    >
      <div
        ref={scrollerRef}
        className={`flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-x-contain no-scrollbar ${
          adaptiveHeight ? 'items-start transition-[height] duration-300 ease-out' : ''
        }`}
        style={adaptiveHeight && height ? { height } : undefined}
        onTouchStart={() => {
          touching.current = true;
          touched();
        }}
        onTouchEnd={() => {
          touching.current = false;
          touched();
        }}
        onTouchCancel={() => {
          touching.current = false;
        }}
        onPointerDown={touched}
      >
        {slides.map(({ item, index, key }, s) => {
          const isCopy = looping && (s === 0 || s === slideCount - 1);
          return (
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              aria-hidden={isCopy || undefined}
              inert={s !== slide}
              className="w-full shrink-0 snap-center snap-always px-4 min-w-0"
            >
              {renderItem(item, index, s === slide)}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-4 px-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!looping && active === 0}
            aria-label="Previous"
            className={NAV_BUTTON}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {count <= MAX_DOTS ? (
            <div className="flex items-center">
              {items.map((item, i) => (
                <button
                  key={getKey(item, i)}
                  type="button"
                  onClick={() => {
                    touched();
                    goToSlide(i + offset);
                  }}
                  aria-label={`Go to ${i + 1} of ${count}`}
                  aria-current={i === active}
                  className="w-6 h-8 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3FF] rounded-full"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      i === active ? 'w-5 bg-[#1769FF]' : 'w-2 bg-white/35'
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 min-w-[6.5rem]" aria-live="polite">
              <span className="text-sm font-semibold text-white tabular-nums">
                {active + 1} <span className="text-white/50">/ {count}</span>
              </span>
              <span className="relative block w-24 h-1 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[#1769FF] transition-[width] duration-300"
                  style={{ width: `${((active + 1) / count) * 100}%` }}
                />
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => step(1)}
            disabled={!looping && active === count - 1}
            aria-label="Next"
            className={NAV_BUTTON}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
