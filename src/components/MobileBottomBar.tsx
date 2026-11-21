import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Home, Dumbbell, HeartPulse, TrendingUp, UserRound, X } from 'lucide-react';
import { PageId } from '../types';
import { pageLink } from '../lib/routes';

interface MobileBottomBarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

/** Pages in the half-circle menu, left to right along the arc */
const MENU_ITEMS: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'services', label: 'Services', icon: Dumbbell },
  { id: 'senior-fitness', label: 'Senior Fitness', icon: HeartPulse },
  { id: 'transformations', label: 'Transformations', icon: TrendingUp },
  { id: 'about', label: 'About Samir', icon: UserRound },
];

/** Angles (degrees) of the items on the arc: 165° is far left, 15° far right */
const ANGLES = [165, 127.5, 90, 52.5, 15];
/** The arc is centred on the top edge of the bar (the bar is 4rem tall) */
const BAR_HEIGHT = 64;
/** Items sit this far above the arc centre so the lowest labels clear the bar */
const ARC_LIFT = 22;

/** Arc radius: as large as fits the screen width, with room for the item labels */
const arcRadius = () => (typeof window === 'undefined' ? 128 : Math.max(100, Math.min(132, window.innerWidth / 2 - 46)));

const TAB =
  'flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-lg transition-all cursor-pointer';

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ currentPage, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [radius, setRadius] = useState(128);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setIsMenuOpen(false);

  const toggleMenu = () => {
    if (!isMenuOpen) setRadius(arcRadius());
    setIsMenuOpen((open) => !open);
  };

  // Escape closes; growing to desktop width (no bottom bar) closes too
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setIsMenuOpen(false);
      else setRadius(arcRadius());
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    firstItemRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen]);

  // Any page change closes the menu
  useEffect(() => {
    setIsMenuOpen(false);
  }, [currentPage]);

  const go = (page: PageId) => {
    setIsMenuOpen(false);
    onNavigate(page);
  };

  const discRadius = radius + 58;

  return (
    <MotionConfig reducedMotion="user">
      {/* Half-circle glass menu. A tap anywhere outside the items closes it. */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="radial-menu"
            id="mobile-radial-menu"
            className="lg:hidden fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Dimmed backdrop (click to close) */}
            <div
              className="absolute inset-0 bg-[#0B1220]/45 backdrop-blur-[2px]"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Frosted half disc behind the items */}
            <motion.div
              aria-hidden="true"
              onClick={closeMenu}
              className="absolute left-1/2 rounded-t-full bg-white/[0.14] backdrop-blur-xl border border-b-0 border-white/35 shadow-[0_-12px_48px_rgba(0,0,0,0.35)]"
              style={{ width: discRadius * 2, height: discRadius, bottom: BAR_HEIGHT, x: '-50%', transformOrigin: '50% 100%' }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />

            <nav aria-label="All pages">
              {MENU_ITEMS.map(({ id, label, icon: Icon }, i) => {
                const rad = (ANGLES[i] * Math.PI) / 180;
                const dx = Math.cos(rad) * radius;
                const dy = Math.sin(rad) * radius;
                const isActive = currentPage === id;
                return (
                  <motion.a
                    key={id}
                    ref={i === 0 ? firstItemRef : undefined}
                    {...pageLink(id, go)}
                    aria-current={isActive ? 'page' : undefined}
                    className="absolute flex flex-col items-center gap-1 cursor-pointer focus:outline-none group"
                    // Item centre sits on the arc; the label hangs below the circle
                    style={{ left: "50%", bottom: BAR_HEIGHT + ARC_LIFT, marginLeft: -26, marginBottom: -26 }}
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                    animate={{ x: dx, y: -dy, scale: 1, opacity: 1 }}
                    exit={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30, delay: i * 0.025 }}
                  >
                    <span
                      className={`w-[52px] h-[52px] rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition-colors group-focus-visible:ring-2 group-focus-visible:ring-white ${
                        isActive
                          ? 'bg-[#1769FF] border-[#5CA0FF] text-white shadow-[#1769FF]/40'
                          : 'bg-white/25 border-white/50 text-white group-hover:bg-white/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    {/* Absolutely placed so a long label never widens the item (keeps the circle centred) */}
                    <span className="absolute top-[56px] left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#0B1220]/55 backdrop-blur-sm text-[length:max(11px,calc(11rem/16))] font-semibold text-white">
                      {label}
                    </span>
                  </motion.a>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <aside
        aria-label="Mobile quick actions"
        className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E1E6EF] px-2 py-1.5 shadow-2xl ${
          isMenuOpen ? 'z-[70]' : 'z-30'
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-1">
          {/* Home Tab */}
          <a
            {...pageLink('home', go)}
            aria-current={currentPage === 'home' ? 'page' : undefined}
            className={`${TAB} ${currentPage === 'home' ? 'text-[#1769FF] font-semibold' : 'text-[#646B78] hover:text-[#171A21]'}`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[length:max(10px,calc(10rem/16))] mt-0.5">Home</span>
          </a>

          {/* Menu: opens the half-circle page menu */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-radial-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu with all pages'}
            className={`${TAB} ${isMenuOpen ? 'text-[#1769FF]' : 'text-[#171A21] hover:bg-[#EEF5FF]'}`}
          >
            <span
              className={`w-9 h-6 rounded-full flex items-center justify-center transition-colors ${
                isMenuOpen ? 'bg-[#1769FF] text-white' : 'bg-[#EEF5FF]'
              }`}
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <span className="flex flex-col justify-between w-4 h-3">
                  <span className="w-full h-0.5 bg-[#1769FF] rounded-full" />
                  <span className="w-full h-0.5 bg-[#1769FF] rounded-full" />
                  <span className="w-full h-0.5 bg-[#1769FF] rounded-full" />
                </span>
              )}
            </span>
            <span className="text-[length:max(10px,calc(10rem/16))] font-bold text-[#1769FF] mt-0.5">Menu</span>
          </button>

          {/* Transformations Tab */}
          <a
            {...pageLink('transformations', go)}
            aria-current={currentPage === 'transformations' ? 'page' : undefined}
            className={`${TAB} ${
              currentPage === 'transformations' ? 'text-[#1769FF] font-semibold' : 'text-[#646B78] hover:text-[#171A21]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[length:max(10px,calc(10rem/16))] mt-0.5">Transformations</span>
          </a>
        </div>
      </aside>
    </MotionConfig>
  );
};
