import type { PageId } from '../types';
import { BUSINESS_INFO, SERVICES } from '../data/mockData';
import { PAGE_PATHS } from './routes';

/**
 * Production origin used for canonical links, Open Graph URLs, JSON-LD and the sitemap.
 * Change this ONE value when the custom domain goes live, then redeploy.
 * No trailing slash.
 */
export const SITE_URL = 'https://teamsamir.com';

/** Official brand name used in titles, Open Graph and JSON-LD (Google site name). */
export const SITE_NAME = 'Team Samir';

/** Other spellings of the brand; tells search engines they are the same brand. */
export const SITE_ALT_NAMES = ['TeamSamir', 'Team Samir Fitness', 'TS Fitness'];

/** Brand description used in the Organization JSON-LD. Verified facts only. */
const BRAND_DESCRIPTION =
  'Team Samir is a fitness coaching business in Kothrud, Pune, led by Coach Samir, offering 1-on-1 personal training, nutrition coaching and senior fitness training.';

/** Topics the brand is known for (JSON-LD knowsAbout). */
const KEY_TOPICS = ['Fitness Coaching', 'Personal Training', 'Nutrition Coaching', 'Senior Fitness Training'];

/**
 * Official social profiles (JSON-LD sameAs). Clean profile URLs only, no tracking
 * parameters. Add a profile here only when it is the brand's own account.
 */
export const SOCIAL_PROFILES = [`https://www.instagram.com/${BUSINESS_INFO.social.instagramHandle}/`];

export interface PageMeta {
  title: string;
  description: string;
  /** Path of the share image under /public (1200×630) */
  image: string;
  imageAlt: string;
  /** false = noindex (kept out of the sitemap) */
  index: boolean;
}

/** Team Samir logo and tagline on the brand's dark blue (shown when the Home link is shared) */
const DEFAULT_IMAGE = '/media/shared/og/og-logo.jpg';

export const PAGE_META: Record<PageId, PageMeta> = {
  home: {
    title: 'Team Samir | Fitness Coaching & Personal Training in Pune',
    description:
      'Team Samir offers fitness coaching, 1-on-1 personal training and nutrition coaching with Coach Samir in Kothrud, Pune. Book a free consultation today.',
    image: DEFAULT_IMAGE,
    imageAlt: 'Team Samir logo with the tagline: Your fitness. Your goals. Our expertise.',
    index: true,
  },
  services: {
    title: 'Personal Training & Nutrition Coaching Services | Team Samir',
    description:
      'Explore Team Samir coaching: 1-on-1 personal training, nutrition coaching, health management and offline training in Pune. Compare plans and book a free consultation.',
    image: '/media/shared/og/og-services.jpg',
    imageAlt: 'Personal training session with a Team Samir coach',
    index: true,
  },
  'senior-fitness': {
    title: 'Senior Fitness Training for Older Adults | Team Samir',
    description:
      'One-on-one fitness training for senior citizens in Pune with Team Samir: safe, low-impact exercise for strength, balance and mobility, planned around your health needs.',
    image: '/media/shared/og/og-senior-fitness.jpg',
    imageAlt: 'Senior fitness training session focused on strength and balance',
    index: true,
  },
  transformations: {
    title: 'Client Transformations & Training Stories | Team Samir',
    description:
      'See training journeys, before-and-after progress and workout videos from Team Samir fitness coaching in Pune. Individual results vary with effort and consistency.',
    image: '/media/shared/og/og-transformations.jpg',
    imageAlt: 'Strength training highlights from Team Samir coaching',
    index: true,
  },
  about: {
    title: 'About Samir | Personal Trainer & Fitness Coach | Team Samir',
    description:
      'Meet Samir, founder and head coach of Team Samir in Kothrud, Pune. Learn about his coaching approach: technique first, progressive training and Indian nutrition.',
    image: '/media/shared/og/og-about.jpg',
    imageAlt: 'Samir, founder and head coach of Team Samir',
    index: true,
  },
  contact: {
    title: 'Book a Free Consultation | Team Samir',
    description:
      'Share your fitness goals and preferred plan, and the Team Samir team will call you to arrange a free consultation with Coach Samir in Pune.',
    image: DEFAULT_IMAGE,
    imageAlt: 'Team Samir personal training',
    index: false, // form page: reachable from every CTA, kept out of search results
  },
};

export const NOT_FOUND_META: PageMeta = {
  title: 'Page Not Found | Team Samir',
  description: 'The page you were looking for does not exist. Go back to the Team Samir home page.',
  image: DEFAULT_IMAGE,
  imageAlt: 'Team Samir',
  index: false,
};

export const canonicalUrl = (page: PageId) => SITE_URL + PAGE_PATHS[page];
const abs = (path: string) => (path.startsWith('http') ? path : SITE_URL + path);

// ───────────── Structured data (JSON-LD) ─────────────
// Only facts that are visible on the site. No ratings, reviews or unverified figures.

const ORG_ID = `${SITE_URL}/#organization`;
const PERSON_ID = `${SITE_URL}/#samir`;

const organization = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  description: BRAND_DESCRIPTION,
  url: `${SITE_URL}/`,
  logo: abs('/media/shared/logo/logo-black.jpeg'),
  image: abs(DEFAULT_IMAGE),
  sameAs: SOCIAL_PROFILES,
  email: BUSINESS_INFO.contact.email,
  telephone: BUSINESS_INFO.contact.phoneRaw,
  founder: { '@id': PERSON_ID },
  knowsAbout: KEY_TOPICS,
  areaServed: { '@type': 'City', name: BUSINESS_INFO.location.city },
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS_INFO.location.line1,
    addressLocality: BUSINESS_INFO.location.city,
    addressRegion: BUSINESS_INFO.location.state,
    postalCode: BUSINESS_INFO.location.pincode,
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    telephone: BUSINESS_INFO.contact.phoneRaw,
    email: BUSINESS_INFO.contact.email,
    availableLanguage: ['English', 'Hindi', 'Marathi'],
  },
});

const person = () => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: BUSINESS_INFO.trainerName,
  jobTitle: 'Founder & Head Coach',
  worksFor: { '@id': ORG_ID },
  url: canonicalUrl('about'),
  knowsAbout: KEY_TOPICS,
});

const website = () => ({
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: `${SITE_URL}/`,
  publisher: { '@id': ORG_ID },
  inLanguage: 'en',
});

const breadcrumb = (page: PageId) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('home') },
    { '@type': 'ListItem', position: 2, name: PAGE_LABELS[page], item: canonicalUrl(page) },
  ],
});

export const PAGE_LABELS: Record<PageId, string> = {
  home: 'Home',
  services: 'Services',
  'senior-fitness': 'Senior Fitness',
  transformations: 'Transformations',
  about: 'About Samir',
  contact: 'Free Consultation',
};

/** JSON-LD graph for a page (one script tag per page, no duplicates). */
export const structuredData = (page: PageId) => {
  const graph: object[] = [organization(), website()];
  if (page === 'home' || page === 'about') graph.push(person());
  if (page !== 'home') graph.push(breadcrumb(page));
  if (page === 'services') {
    SERVICES.forEach((s) =>
      graph.push({
        '@type': 'Service',
        name: s.title,
        serviceType: s.title,
        provider: { '@id': ORG_ID },
        areaServed: { '@type': 'City', name: BUSINESS_INFO.location.city },
        url: canonicalUrl('services'),
      })
    );
  }
  if (page === 'senior-fitness') {
    graph.push({
      '@type': 'Service',
      name: 'Senior Fitness Training',
      serviceType: 'Personal training for older adults',
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'City', name: BUSINESS_INFO.location.city },
      url: canonicalUrl('senior-fitness'),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
};

/** JSON-LD as a string that is safe inside a <script> tag. */
const structuredDataJson = (page: PageId) => JSON.stringify(structuredData(page)).replace(/</g, '\\u003c');

// ───────────── <head> tags ─────────────

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const robots = (meta: PageMeta) =>
  meta.index ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, follow';

/** Head tags for prerendered HTML (scripts/prerender.mjs). */
export const headHtml = (page: PageId | null): string => {
  const meta = page ? PAGE_META[page] : NOT_FOUND_META;
  const url = page ? canonicalUrl(page) : `${SITE_URL}/`;
  const image = abs(meta.image);
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${robots(meta)}" />`,
    page ? `<link rel="canonical" href="${url}" />` : '',
    `<meta name="application-name" content="${SITE_NAME}" />`,
    `<meta name="apple-mobile-web-app-title" content="${SITE_NAME}" />`,
    `<meta name="theme-color" content="#111318" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:secure_url" content="${image}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(meta.imageAlt)}" />`,
    page ? `<script type="application/ld+json">${structuredDataJson(page)}</script>` : '',
  ];
  return tags.filter(Boolean).join('\n    ');
};

/**
 * Keeps <head> in sync on in-app navigation. Updates the tags written by the
 * prerender in place (never adds duplicates).
 */
export const applyHead = (page: PageId | null) => {
  if (typeof document === 'undefined') return;
  const meta = page ? PAGE_META[page] : NOT_FOUND_META;
  const url = page ? canonicalUrl(page) : `${SITE_URL}/`;
  const image = abs(meta.image);
  document.title = meta.title;

  const set = (selector: string, attr: string, value: string) => {
    const el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  set('meta[name="description"]', 'content', meta.description);
  set('meta[name="robots"]', 'content', robots(meta));
  set('link[rel="canonical"]', 'href', url);
  set('meta[property="og:title"]', 'content', meta.title);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[property="og:url"]', 'content', url);
  set('meta[property="og:image"]', 'content', image);
  set('meta[property="og:image:secure_url"]', 'content', image);
  set('meta[property="og:image:alt"]', 'content', meta.imageAlt);
  set('meta[name="twitter:title"]', 'content', meta.title);
  set('meta[name="twitter:description"]', 'content', meta.description);
  set('meta[name="twitter:image"]', 'content', image);
  set('meta[name="twitter:image:alt"]', 'content', meta.imageAlt);

  const ld = document.head.querySelector('script[type="application/ld+json"]');
  if (ld && page) ld.textContent = structuredDataJson(page);
};
