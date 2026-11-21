import React, { useState, useEffect } from 'react';

interface HeroRevealProps {
  sentence?: string;
  className?: string;
  /** Extra words (case-insensitive) to show in the blue gradient, e.g. ['body', '&', 'routine'] */
  highlightWords?: string[];
  /** Replaces the default heading size/layout classes (used by other page heroes) */
  headingClassName?: string;
  /**
   * All the sentences that can appear here (for rotating headlines). The heading is then
   * always as tall as the longest of them at the current screen width, so the content
   * below never jumps when the headline changes.
   */
  reserveFor?: string[];
}

const DEFAULT_HEADING_CLASS =
  'font-bold text-lg sm:text-2xl lg:text-[1.6rem] xl:text-[1.75rem] leading-snug flex flex-wrap gap-y-0.5';

export const HeroReveal: React.FC<HeroRevealProps> = ({
  sentence = '🔢 Tired of Counting Calories, 🥗 Boring Salads & 🌶️ Missing Your Masala Food? 💪 You’re in the Right Place! 🎯',
  className = '',
  highlightWords = [],
  headingClassName = DEFAULT_HEADING_CLASS,
  reserveFor,
}) => {
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const words = sentence.split(' ');

  // Staggered word-by-word reveal, replayed whenever the sentence changes
  useEffect(() => {
    setRevealedIndex(-1);
    const timeouts = words.map((_, idx) =>
      setTimeout(() => setRevealedIndex(idx), idx * 70 + 60)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [sentence, words.length]);

  const isHighlight = (word: string) =>
    word.toLowerCase().includes('fitness') ||
    word.toLowerCase().includes('k11') ||
    word.toLowerCase().includes('life') ||
    word.toLowerCase().includes('Our') ||
    word.toLowerCase().includes('elevate') ||
    highlightWords.includes(word.toLowerCase());

  const headingClass = `font-display tracking-tight text-white items-center gap-x-[0.3em] ${headingClassName}`;

  /** Words of a sentence; `animate` adds the reveal transition (the hidden sizers skip it) */
  const renderWords = (text: string, animate: boolean) =>
    text.split(' ').map((word, idx) => (
      <span
        key={`${text}-${idx}`}
        className={`inline-block ${
          animate
            ? `transition-all duration-500 ease-out transform ${
                idx <= revealedIndex
                  ? 'opacity-100 translate-y-0 scale-100 filter-none'
                  : 'opacity-0 translate-y-4 scale-95 blur-[2px]'
              }`
            : ''
        } ${
          isHighlight(word)
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#00A3FF] via-[#38BDF8] to-[#1769FF] font-black drop-shadow-[0_0_20px_rgba(0,163,255,0.4)]'
            : 'text-white'
        }`}
      >
        {word}
      </span>
    ));

  const heading = <h1 className={`${headingClass} ${reserveFor ? 'col-start-1 row-start-1 content-start' : ''}`}>{renderWords(sentence, true)}</h1>;

  if (!reserveFor?.length) {
    return <div className={className}>{heading}</div>;
  }

  // All sentences share one grid cell; the invisible copies give the cell the height of the longest
  return (
    <div className={`grid ${className}`}>
      {reserveFor.map((text) => (
        <div key={text} aria-hidden="true" className={`${headingClass} col-start-1 row-start-1 invisible select-none`}>
          {renderWords(text, false)}
        </div>
      ))}
      {heading}
    </div>
  );
};
