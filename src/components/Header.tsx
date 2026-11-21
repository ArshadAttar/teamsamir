import React, { useEffect, useState } from 'react';
import { PageId } from '../types';
import { TeamSamirLogo } from './TeamSamirLogo';
import { Calendar } from 'lucide-react';
import { pageLink } from '../lib/routes';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onBookDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onBookDemo,
}) => {
  // Clean navigation items without any numbering
  const navItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'senior-fitness', label: 'Senior Fitness' },
    { id: 'transformations', label: 'Transformations' },
    { id: 'about', label: 'About Samir' },
  ];

  // Hide the header while the user scrolls down, bring it back when they scroll up.
  // Only the user's own scrolling counts: layout changes (the rotating hero headline,
  // images and videos loading, carousels) also fire scroll events, and those must not
  // make the header slide in and out on its own.
  // While it is hidden, a floating "Free Consultation" button takes its place.
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let travel = 0; // distance scrolled in the current direction
    let lastInput = 0; // time of the last wheel / touch / key / scrollbar input
    let touching = false;
    let ticking = false;
    // Touch scrolling keeps moving (momentum) for a while after the finger lifts
    const INPUT_WINDOW_MS = 1200;
    const THRESHOLD = 24;

    const markInput = () => {
      lastInput = performance.now();
    };
    const onTouchStart = () => {
      touching = true;
      markInput();
    };
    const onTouchEnd = () => {
      touching = false;
      markInput();
    };
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) markInput();
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY;
        lastY = y;
        if (y < 80) {
          travel = 0;
          setIsHidden(false); // always visible near the top
          return;
        }
        const userScrolling = touching || performance.now() - lastInput < INPUT_WINDOW_MS;
        if (!userScrolling || delta === 0) return;
        // Restart the count whenever the direction changes
        travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
        if (travel > THRESHOLD) setIsHidden(true); // scrolling down, towards the footer
        else if (travel < -THRESHOLD) setIsHidden(false); // scrolling up, towards the top
      });
    };

    const opts = { passive: true } as const;
    window.addEventListener('scroll', onScroll, opts);
    window.addEventListener('wheel', markInput, opts);
    window.addEventListener('touchstart', onTouchStart, opts);
    window.addEventListener('touchmove', markInput, opts);
    window.addEventListener('touchend', onTouchEnd, opts);
    window.addEventListener('touchcancel', onTouchEnd, opts);
    window.addEventListener('pointerdown', markInput, opts); // dragging the scrollbar
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', markInput);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', markInput);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('pointerdown', markInput);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E1E6EF] transition-transform duration-300 ease-out ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-18 lg:h-20 flex items-center justify-between gap-2 sm:gap-6">

        {/* Zone 1: Brand Wordmark (Compact on mobile so it never crowds controls) */}
        <a
          {...pageLink('home', onNavigate)}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769FF] rounded-md transition-opacity hover:opacity-90 shrink-0 text-left"
          aria-label="Go to TeamSamir Home"
        >
          <div className="sm:hidden">
            <TeamSamirLogo variant="light" size="sm" />
          </div>
          <div className="hidden sm:block">
            <TeamSamirLogo variant="light" size="md" />
          </div>
        </a>

        {/* Zone 2: Desktop Navigation Links (single-line, unboxed, NO numbers) */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-[#171A21]" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <a
                key={item.id}
                {...pageLink(item.id, onNavigate)}
                className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                  isActive
                    ? 'text-[#1769FF] font-semibold'
                    : 'text-[#646B78] hover:text-[#171A21]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1769FF] rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary CTA on every screen (the page menu on phones and tablets is in MobileBottomBar) */}
        <button
          onClick={onBookDemo}
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[44px] px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#1769FF] hover:bg-[#0B3D91] active:scale-[0.98] rounded-lg sm:rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Calendar className="w-3.5 h-3.5 sm:hidden shrink-0" />
          Free Consultation
        </button>

      </div>

      {/* Mobile quick navigation tabs: the same padding on all four sides of the strip */}
      <nav
        aria-label="Quick page links"
        className="lg:hidden bg-slate-50/95 border-t border-[#E1E6EF] p-1.5 sm:px-4 overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 scroll-smooth"
      >
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <a
              key={item.id}
              {...pageLink(item.id, onNavigate)}
              aria-current={isActive ? 'page' : undefined}
              className={`cursor-pointer whitespace-nowrap text-[length:max(11px,calc(11rem/16))] sm:text-xs font-medium leading-none py-2.5 px-3 rounded-md transition-all shrink-0 ${
                isActive
                  ? 'bg-[#1769FF] text-white font-semibold shadow-xs'
                  : 'text-[#646B78] hover:text-[#171A21] hover:bg-slate-200/50'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>

    {/* Floating "Free Consultation" shown only while the header is hidden */}
    <button
      onClick={onBookDemo}
      tabIndex={isHidden ? 0 : -1}
      aria-hidden={!isHidden}
      className={`fixed top-3 right-3 sm:right-6 lg:right-8 z-40 inline-flex items-center gap-2 min-h-[44px] px-4 lg:px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#1769FF] hover:bg-[#0B3D91] active:scale-[0.98] rounded-xl shadow-lg shadow-[#1769FF]/30 transition-all duration-300 ease-out cursor-pointer whitespace-nowrap ${
        isHidden ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0 pointer-events-none'
      }`}
    >
      <Calendar className="w-4 h-4 shrink-0" />
      Free Consultation
    </button>
    </>
  );
};
