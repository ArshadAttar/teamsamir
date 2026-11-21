import React from 'react';
import { PageId } from '../types';
import { TeamSamirLogo } from './TeamSamirLogo';
import { MapPin, Phone, Mail, Clock, ArrowUpRight, ShieldCheck, Instagram } from 'lucide-react';
import { BUSINESS_INFO } from '../data/mockData';
import { pageLink } from '../lib/routes';
import { WhatsAppIcon } from './WhatsAppFloat';

interface FooterProps {
  onNavigate: (page: PageId) => void;
  onBookDemo: () => void;
}

const PAGE_LINKS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'senior-fitness', label: 'Senior Fitness' },
  { id: 'transformations', label: 'Transformations' },
  { id: 'about', label: 'About Samir' },
];

const SERVICE_LINKS = ['1-on-1 Personal Training', 'Health Management', 'Nutrition Guidance', 'Offline Training ( Pune )'];

/** Phones: tight rows; tablets keep 32px tap rows; desktop as before */
const LIST = 'space-y-1 sm:space-y-0.5 lg:space-y-2 text-xs sm:text-sm text-slate-400';
const LINK =
  'inline-flex items-center py-0.5 sm:py-0 sm:min-h-[32px] lg:min-h-0 hover:text-white transition-colors cursor-pointer text-left';

/** Short form of the opening hours for the one-line phone layout ("Mon–Sat: 6 AM–10 PM") */
const shortHours = (hours: string) =>
  hours
    .replace(/,?\s*IST\s*$/i, '')
    .replace(/:00/g, '')
    .replace(/\s*–\s*/g, '–')
    .trim();

/**
 * On phones and tablets, open the profile in the same tab: Android and iOS hand an
 * instagram.com link to the Instagram app when it is installed (a new tab often stays in
 * the browser). Without the app, instagram.com opens, where people can log in or get the
 * app. Computers keep the normal new-tab link.
 */
const openInstagram = (e: React.MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  e.preventDefault();
  window.location.href = BUSINESS_INFO.social.instagramUrl;
};

export const Footer: React.FC<FooterProps> = ({ onNavigate, onBookDemo }) => {
  const whatsappHref = `https://wa.me/${BUSINESS_INFO.contact.whatsappNumber}?text=${encodeURIComponent(
    'Hi Samir, I want to book a free demo session at TeamSamir in Pune.'
  )}`;

  return (
    <footer className="bg-[#111318] text-white border-t border-[#1C2028]">
      {/* Top Banner / Pre-footer callout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 border-b border-[#1C2028]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-6">
          <div>
            <h3 className="text-base sm:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
              Start Your Personalized Fitness Journey with TeamSamir
            </h3>
            <p className="text-[#646B78] text-xs sm:text-sm mt-0.5 sm:mt-1 max-w-xl">
              {BUSINESS_INFO.experienceYears}+ Years of Experience · {BUSINESS_INFO.clientsTrained} Clients Trained · {BUSINESS_INFO.celebritiesTrained} Celebrities Trained · Kothrud, Pune.
            </p>
          </div>
          <button
            onClick={onBookDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 min-h-[40px] sm:min-h-0 text-xs sm:text-sm font-semibold text-white bg-[#1769FF] hover:bg-[#00A3FF] rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span>Free Consultation</span>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-12 lg:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-10">
        {/* Brand & About Column (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5 sm:space-y-4">
          <TeamSamirLogo variant="dark" size="sm" />
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
            High-standard personal fitness training, athletic coaching, and sustainable nutrition guidance led by Coach Samir.
          </p>
        </div>

        {/* Quick Links & Services: 2-column grid on mobile, individual cols on desktop */}
        <div className="grid grid-cols-2 gap-4 col-span-1 md:contents lg:contents">
          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-1.5 sm:space-y-3">
            <h4 className="text-[length:max(11px,calc(11rem/16))] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">Pages</h4>
            <ul className={LIST}>
              {PAGE_LINKS.map((link) => (
                <li key={link.id}>
                  <a {...pageLink(link.id, onNavigate)} className={LINK}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Training Formats */}
          <div className="lg:col-span-2 space-y-1.5 sm:space-y-3">
            <h4 className="text-[length:max(11px,calc(11rem/16))] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">Services</h4>
            <ul className={LIST}>
              {SERVICE_LINKS.map((label) => (
                <li key={label}>
                  <a {...pageLink('services', onNavigate)} className={LINK}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Direct Contact Information (4 cols). Phones: address, then both numbers on one line, then email and hours on one line */}
        <div className="lg:col-span-4 space-y-2 sm:space-y-3">
          <h4 className="text-[length:max(11px,calc(11rem/16))] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">Location & Contact</h4>
          <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-slate-400">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A3FF] shrink-0 mt-0.5" />
              <p className="text-white font-medium text-xs sm:text-sm">
                {BUSINESS_INFO.location.fullAddress}
                <span className="sm:hidden text-slate-400 font-normal">, Maharashtra 411038</span>
                <span className="hidden sm:block text-[length:max(11px,calc(11rem/16))] sm:text-xs text-slate-400 font-normal mt-0.5">
                  Pune, Maharashtra 411038
                </span>
              </p>
            </div>

            {/* Phone + WhatsApp */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-start sm:gap-2.5">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A3FF] shrink-0" />
                <a
                  href={`tel:${BUSINESS_INFO.contact.phoneRaw}`}
                  className="sm:py-1 lg:py-0 text-white hover:text-[#00A3FF] font-medium transition-colors whitespace-nowrap"
                >
                  {BUSINESS_INFO.contact.phone}
                </a>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <WhatsAppIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#25D366] shrink-0" />
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:py-1 lg:py-0 text-white hover:text-[#16834A] font-medium transition-colors whitespace-nowrap"
                >
                  {BUSINESS_INFO.contact.whatsapp}
                  <span className="hidden sm:inline"> - WhatsApp</span>
                  <span className="sm:hidden sr-only"> (WhatsApp)</span>
                </a>
              </div>
            </div>

            {/* Instagram (opens the Instagram app when it is installed, otherwise instagram.com) */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <a
                href={BUSINESS_INFO.social.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openInstagram}
                aria-label={`TeamSamir on Instagram (@${BUSINESS_INFO.social.instagramHandle})`}
                className="group inline-flex items-center gap-2 sm:gap-2.5 sm:py-1 lg:py-0 text-white hover:text-[#E1306C] font-medium transition-colors"
              >
                <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[5px] flex items-center justify-center text-white bg-[linear-gradient(45deg,#F58529,#DD2A7B_50%,#8134AF_75%,#515BD4)] shrink-0">
                  <Instagram className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <span>@{BUSINESS_INFO.social.instagramHandle}</span>
              </a>
            </div>

            {/* Email + working hours */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-start sm:gap-2.5">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A3FF] shrink-0" />
                <a
                  href={`mailto:${BUSINESS_INFO.contact.email}`}
                  className="sm:py-1 lg:py-0 break-all text-slate-300 hover:text-white transition-colors"
                >
                  {BUSINESS_INFO.contact.email}
                </a>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A3FF] shrink-0" />
                <span className="text-[length:max(11px,calc(11rem/16))] sm:text-xs text-slate-300 whitespace-nowrap sm:whitespace-normal">
                  <span className="sm:hidden">{shortHours(BUSINESS_INFO.contact.workingHours)}</span>
                  <span className="hidden sm:inline">{BUSINESS_INFO.contact.workingHours}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-6 border-t border-[#1C2028] flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-[length:max(11px,calc(11rem/16))] sm:text-xs text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2 text-center sm:text-left">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#16834A] shrink-0" />
          <span>© {new Date().getFullYear()} TeamSamir. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-400">
          <span>Certified Personal Training & Coaching</span>
        </div>
      </div>
    </footer>
  );
};
