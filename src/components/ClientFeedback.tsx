import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LazyVideo } from './LazyVideo';
import { Star, Quote, CheckCircle2, Video, MapPin, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { REVIEWS, VIDEO_FEEDBACK } from '../data/mockData';
import { ReviewItem, VideoFeedbackItem } from '../types';
import { Marquee } from './Marquee';
import { SnapCarousel } from './SnapCarousel';
import { useIsPhone } from '../lib/useMediaQuery';

/* Shared frosted-glass card surface */
const GLASS =
  'h-full rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-colors duration-300 hover:bg-white/[0.12] hover:border-white/30';

/** Turns **text** into bold; everything else is plain text */
const renderBold = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );

/** Review text with the client's own paragraphs ('\n\n') and line breaks ('\n') kept */
const ReviewText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {text.split('\n\n').map((para, i) => (
      <p key={i} className="whitespace-pre-line">
        {renderBold(para)}
      </p>
    ))}
  </div>
);

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
    ))}
  </div>
);

const ReviewAuthor: React.FC<{ review: ReviewItem }> = ({ review }) => (
  <div className="flex items-center gap-3 min-w-0">
    <img decoding="async"
      src={review.avatar}
      alt=""
      loading="lazy"
      className="w-11 h-11 rounded-full object-cover border-2 border-white/30 shrink-0"
    />
    <div className="min-w-0">
      <div className="text-sm font-bold text-white truncate">{review.name}</div>
      <div className="mt-0.5 inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-full bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[length:max(11px,calc(11rem/16))] font-semibold text-[#5CC8FF]">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{review.location}</span>
      </div>
    </div>
  </div>
);

const ResultBadge: React.FC<{ text: string }> = ({ text }) => (
  <span className="self-start inline-flex items-start gap-1.5 text-[length:max(11px,calc(11rem/16))] font-semibold px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
    <span className="line-clamp-2">{text}</span>
  </span>
);

/**
 * Review card. Long messages show a faded preview and a "Read more" button that expands
 * this card in place to the full message ("Show less" collapses it again). Each card
 * expands on its own.
 * - `strip` (tablets and laptops): fixed-height card in the scrolling strip; the preview
 *   fills the card.
 * - `single` (phones, one card per screen): the card is as tall as its content; the
 *   preview is about 8 lines.
 */
const ReviewCard: React.FC<{
  review: ReviewItem;
  isCopy?: boolean;
  layout?: 'strip' | 'single';
  onExpandedChange?: (expanded: boolean) => void;
}> = ({ review, isCopy = false, layout = 'strip', onExpandedChange }) => {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const textBoxRef = useRef<HTMLDivElement>(null);
  const textId = useId();
  // Assume long until measured (prerendered HTML shows the button)
  const [overflows, setOverflows] = useState(true);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  useEffect(() => {
    const el = textBoxRef.current;
    if (!el) return;
    // Only measure the collapsed preview (expanded, the text always fits)
    const measure = () => {
      if (!expandedRef.current) setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onExpandedChangeRef = useRef(onExpandedChange);
  onExpandedChangeRef.current = onExpandedChange;
  // A card removed while expanded (e.g. on resize) must not keep its strip paused
  useEffect(() => () => {
    if (expandedRef.current) onExpandedChangeRef.current?.(false);
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
    if (!next) {
      // Collapsing a long review: bring the card's top back on screen if it scrolled away
      requestAnimationFrame(() => {
        const top = cardRef.current?.getBoundingClientRect().top;
        if (top !== undefined && top < 72) window.scrollBy({ top: top - 88, behavior: 'smooth' });
      });
    }
  };

  const single = layout === 'single';
  const cardSize = expanded
    ? single
      ? ''
      : 'min-h-[440px] sm:min-h-[462px]'
    : single
      ? ''
      : 'h-[440px] sm:h-[462px]';
  const previewSize = expanded ? '' : single ? 'max-h-[13em]' : 'h-full';

  return (
    <article ref={cardRef} className={`${GLASS} ${cardSize} p-5 sm:p-6 flex flex-col gap-4`}>
      <div className="flex items-center justify-between shrink-0">
        <Stars count={review.stars} />
        <Quote className="w-6 h-6 text-[#00A3FF]/50" />
      </div>

      {/* Message: collapsed, the end of a long message is faded out */}
      <div className={`relative min-h-0 ${!single && !expanded ? 'flex-1' : ''}`}>
        <div
          ref={textBoxRef}
          id={textId}
          className={`text-sm leading-relaxed ${previewSize} ${
            expanded ? '' : `overflow-hidden ${overflows ? '[mask-image:linear-gradient(to_bottom,black_65%,transparent)]' : ''}`
          }`}
        >
          <ReviewText text={review.comment} className="text-slate-100" />
        </div>
      </div>

      {overflows && (
        <button
          type="button"
          tabIndex={isCopy ? -1 : undefined}
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={textId}
          className="self-start -mt-2 shrink-0 inline-flex items-center min-h-8 px-1 -mx-1 text-[length:max(13px,calc(13rem/16))] font-semibold text-[#00A3FF] hover:text-white underline underline-offset-4 decoration-[#00A3FF]/40 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3FF] rounded"
        >
          {expanded ? 'Show less' : 'Read more'}
          <span className="sr-only"> of the review by {review.name}</span>
        </button>
      )}

      <div className="shrink-0">
        <ResultBadge text={review.resultBadge} />
      </div>

      <div className={`shrink-0 pt-4 border-t border-white/10 ${!single ? 'mt-auto' : ''}`}>
        <ReviewAuthor review={review} />
      </div>
    </article>
  );
};

/** Fired when a card turns its sound on, so every other card mutes (only one plays audio) */
const UNMUTE_EVENT = 'feedback-video-unmute';

const CONTROL_BUTTON =
  'w-9 h-9 [@media(hover:none)]:w-11 [@media(hover:none)]:h-11 rounded-full flex items-center justify-center bg-black/55 backdrop-blur-md text-white border border-white/25 hover:bg-[#1769FF] hover:border-[#1769FF] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

/**
 * Video card with no text. Starts muted, loops, and plays automatically while on screen
 * (LazyVideo fetches the file only when it gets near the screen and pauses it off screen).
 * Hovering shows a sound button and a play/pause button (always shown on touch screens).
 */
const VideoCard: React.FC<{ video: VideoFeedbackItem; isCopy: boolean }> = ({ video, isCopy }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardId = useId();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Mute this card when another card turns its sound on
  useEffect(() => {
    const onOtherUnmute = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== cardId && videoRef.current) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    };
    window.addEventListener(UNMUTE_EVENT, onOtherUnmute);
    return () => window.removeEventListener(UNMUTE_EVENT, onOtherUnmute);
  }, [cardId]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted) {
      window.dispatchEvent(new CustomEvent(UNMUTE_EVENT, { detail: cardId }));
      if (el.paused) el.play().catch(() => undefined);
    }
  };

  return (
    <article className={`${GLASS} group/video overflow-hidden`}>
      <div className="relative aspect-9/16 bg-black/40">
        {/* Autoplay requires muted + playsInline (iOS) */}
        <LazyVideo
          ref={videoRef}
          src={video.src}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          aria-label="Client feedback video"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Controls: shown on hover/focus (always shown on touch screens, which can't hover) */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover/video:opacity-100 has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={toggleMute}
            tabIndex={isCopy ? -1 : undefined}
            className={CONTROL_BUTTON}
            aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}
            title={isMuted ? 'Sound on' : 'Sound off'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={togglePlay}
            tabIndex={isCopy ? -1 : undefined}
            className={CONTROL_BUTTON}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        </div>
      </div>
    </article>
  );
};

/**
 * Auto-scrolling strip of video-only cards (Home "Video Feedback" and the Transformations page).
 * Full width; the hovered card zooms, and the slot padding leaves room for that zoom.
 */
export const FeedbackVideoStrip: React.FC<{ videos: VideoFeedbackItem[]; label: string }> = ({ videos, label }) => {
  const isPhone = useIsPhone();

  // Phones: one video at a time, centered. Its width is capped so the whole 9:16 card
  // (and the buttons under it) fits on the screen without cropping the video.
  if (isPhone) {
    return (
      <SnapCarousel
        label={label}
        className="pt-8 pb-6"
        items={videos}
        getKey={(v) => v.id}
        renderItem={(v) => (
          <div className="mx-auto w-[min(100%,calc(64svh*9/16))]">
            <VideoCard video={v} isCopy={false} />
          </div>
        )}
      />
    );
  }

  return (
    <Marquee
      label={label}
      secondsPerItem={5}
      zoomOnHover
      minItemsPerLoop={5}
      slotClassName="w-[calc(100cqw/3)] px-[3cqw] lg:w-[20cqw] lg:px-[1.8cqw] py-12"
      items={videos.map((v) => ({ key: v.id, node: (isCopy: boolean) => <VideoCard video={v} isCopy={isCopy} /> }))}
    />
  );
};

/** Written reviews: one card at a time on phones, a scrolling strip on larger screens */
const ReviewsStrip: React.FC = () => {
  const isPhone = useIsPhone();
  // Number of expanded cards: the strip / carousel holds still while someone is reading one
  const [expandedCount, setExpandedCount] = useState(0);
  const onExpandedChange = useCallback((expanded: boolean) => {
    setExpandedCount((n) => Math.max(0, n + (expanded ? 1 : -1)));
  }, []);

  if (isPhone) {
    return (
      <SnapCarousel
        label="Client reviews"
        items={REVIEWS}
        getKey={(r) => r.id}
        adaptiveHeight
        autoAdvanceMs={7000}
        paused={expandedCount > 0}
        renderItem={(r) => <ReviewCard review={r} layout="single" onExpandedChange={onExpandedChange} />}
      />
    );
  }

  return (
    <Marquee
      label="Client reviews"
      secondsPerItem={7}
      paused={expandedCount > 0}
      slotClassName="w-[50cqw] lg:w-[calc(100cqw/3)] pr-6 py-2"
      items={REVIEWS.map((r) => ({
        key: r.id,
        node: (isCopy: boolean) => <ReviewCard review={r} isCopy={isCopy} onExpandedChange={onExpandedChange} />,
      }))}
    />
  );
};

/** Section background: dark gradient with soft colour blobs so the glass cards read well */
const GlassBackdrop: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-[#1769FF]/30 blur-3xl" />
    <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#00A3FF]/20 blur-3xl" />
    <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
  </div>
);

const SectionHeader: React.FC<{ kicker: string; title: string; desc: string; icon?: React.ReactNode }> = ({
  kicker,
  title,
  desc,
  icon,
}) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8 sm:mb-10 space-y-2">
    <div className="inline-flex items-center gap-1.5 text-[length:max(11px,calc(11rem/16))] sm:text-xs font-bold text-[#00A3FF] uppercase tracking-wider">
      {icon}
      {kicker}
    </div>
    <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">{title}</h2>
    <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto">{desc}</p>
  </div>
);

/** Home page: written reviews marquee followed by the video feedback marquee */
export const ClientFeedback: React.FC = () => (
  // One shared background so the two sections flow together without a seam
  <div className="relative overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#0B2A66] to-[#0B1220]">
    <GlassBackdrop />

    {/* Written reviews */}
    <section className="relative pt-8 sm:pt-12 pb-4 sm:pb-6">
      <div className="relative">
        <SectionHeader
          kicker="Client Feedback & Social Proof"
          title="Real Experiences from our clients"
          desc="What our clients say about training with TeamSamir."
        />
        {/* Full-width strip (edge to edge) */}
        <div className="w-full">
          <ReviewsStrip />
        </div>
      </div>
    </section>

    {/* Video feedback */}
    {/* Little bottom padding: the card slots below already add space for the hover zoom */}
    <section className="relative pt-4 sm:pt-6 pb-0 sm:pb-2">
      <div className="relative">
        <SectionHeader
          kicker="Video Feedback"
          title="Listen to Our Clients Share Their Experiences."
          desc="Don't Just Take Our Word for It. Hear It from Our Clients."
          icon={<Video className="w-3.5 h-3.5" />}
        />
        {/* Full-width strip (edge to edge). Pulled up a little to close the gap under the heading */}
        <div className="w-full -mt-4 sm:-mt-6">
          {/*
            5 cards per screen on desktop, 3 on tablet, 1 at a time on phones. The hovered card zooms
            to 120%, so it grows 10% of its width on each side: the side padding (px) is set a
            little larger than that so the zoomed card never touches its neighbours, and the
            vertical padding (py) leaves room for it to grow 10% up and down.
          */}
          <FeedbackVideoStrip videos={VIDEO_FEEDBACK} label="Video feedback" />
        </div>
      </div>
    </section>
  </div>
);
