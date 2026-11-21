import React, { useEffect, useRef, useState } from 'react';
import { EnquiryError, submitEnquiry } from '../lib/submitEnquiry';
import {
  CONTACT_METHODS,
  EMAIL_MAX,
  EMAIL_RE,
  GOALS,
  IN_MOBILE_RE,
  NAME_MAX,
  NAME_RE,
  PHONE_LEN,
} from '../lib/enquiryRules';
import { isTurnstileConfigured, Turnstile, TurnstileHandle } from '../components/Turnstile';
import { BookingIntent, EnquiryFormData, EnquiryFormErrors } from '../types';
import { BUSINESS_INFO, SERVICES } from '../data/mockData';
import { EnquiryPlanPanel, planLabel, planValue, TRIAL_VALUE } from '../components/EnquiryPlanPanel';
import { GreenConfetti } from '../components/GreenConfetti';
import { FormSelect, SelectGroup } from '../components/FormSelect';
import { WhatsAppIcon } from '../components/WhatsAppFloat';
import {
  MapPin,
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Send,
  Loader2,
  Tag,
  ClipboardList,
} from 'lucide-react';

interface ContactPageProps {
  /** Decides which plans show on the left, the preselected plan and the form heading */
  bookingIntent: BookingIntent;
  highlightPlaceholders: boolean;
}

/** Id for one form fill; the server ignores a repeat with the same id (double submit / retry) */
const newSubmissionId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/** Options for the custom "Your Goal" drop-down */
const GOAL_GROUPS: SelectGroup[] = [
  { options: [{ value: '', label: 'Select your goal' }, ...GOALS.map((g) => ({ value: g, label: g }))] },
];

/** Options for the custom "Plan" drop-down: plan names grouped under their service */
const PLAN_GROUPS: SelectGroup[] = [
  {
    options: [
      { value: '', label: planLabel('') },
      { value: TRIAL_VALUE, label: planLabel(TRIAL_VALUE) },
    ],
  },
  ...SERVICES.map((s) => ({
    label: s.title,
    options: s.plans.map((p) => ({
      value: planValue(s.id, p.name),
      label: p.name,
      selectedLabel: `${s.title} – ${p.name}`,
    })),
  })),
];

// Validation rules come from src/lib/enquiryRules.ts (the server checks the same rules again)
const validate = (data: EnquiryFormData, sameAsMobile: boolean): EnquiryFormErrors => {
  const errors: EnquiryFormErrors = {};
  const name = data.fullName.trim();
  if (!name) errors.fullName = 'Name is required.';
  else if (name.length < 2) errors.fullName = 'Name must be at least 2 characters.';
  else if (!NAME_RE.test(name)) errors.fullName = 'Use letters and spaces only.';

  const email = data.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email, e.g. name@example.com.';

  if (!data.mobileNumber) errors.mobileNumber = 'Mobile number is required.';
  else if (!IN_MOBILE_RE.test(data.mobileNumber)) errors.mobileNumber = 'Enter a valid 10-digit mobile number.';

  if (!sameAsMobile) {
    if (!data.whatsappNumber) errors.whatsappNumber = 'WhatsApp number is required.';
    else if (!IN_MOBILE_RE.test(data.whatsappNumber)) errors.whatsappNumber = 'Enter a valid 10-digit WhatsApp number.';
  }
  return errors;
};

/** Plan preselected from the button the visitor clicked */
const initialPlan = (intent: BookingIntent): string => {
  if (intent.kind === 'trial') return TRIAL_VALUE;
  if (intent.kind === 'service') {
    const service = SERVICES.find((s) => s.id === intent.serviceId);
    if (!service) return '';
    const plan = service.plans.find((p) => p.name === intent.planName) ?? service.plans.find((p) => p.popular) ?? service.plans[0];
    return plan ? planValue(service.id, plan.name) : '';
  }
  return '';
};

/** Form heading follows the button the visitor clicked */
const formHeading = (intent: BookingIntent): { title: string; sub: string } => {
  if (intent.heading) return { title: intent.heading, sub: 'Fill in the form and our team will contact you.' };
  if (intent.kind === 'trial') return { title: 'Book Trial – INR 1,999', sub: 'Start your 1-Week trial with TeamSamir. We will call you to confirm your slot.' };
  if (intent.kind === 'service') {
    const service = SERVICES.find((s) => s.id === intent.serviceId);
    const name = service?.title ?? 'this program';
    return intent.planName
      ? { title: `Book ${name} – ${intent.planName}`, sub: 'Your chosen plan is already selected below. We will call you to confirm the details.' }
      : { title: `Enquire for ${name}`, sub: 'Share your details and we will help you pick the right plan.' };
  }
  return { title: 'Book Free Consultation', sub: 'Fill in the form and our team will contact you.' };
};

// Phones: 16px text (iOS zooms the page into any field smaller than that) and a 46px tap height.
// (The two drop-downs are FormSelect, which has its own smaller text.)
const inputClass = (hasError: boolean) =>
  `w-full px-3.5 py-2.5 text-sm max-sm:text-[16px] max-sm:min-h-[46px] rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? 'border-[#C62828] focus:ring-[#C62828]/20 bg-red-50/20' : 'border-[#E1E6EF] focus:ring-[#1769FF]/20 focus:border-[#1769FF]'
  }`;

const SUCCESS_RESET_MS = 5000;

/**
 * Countdown bar on the success screen. Calls onDone after `duration` ms of
 * un-paused time; pausing (hover / keyboard focus) freezes the remaining time.
 */
const AutoResetBar: React.FC<{ duration: number; paused: boolean; onDone: () => void }> = ({ duration, paused, onDone }) => {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current = Math.min(duration, elapsedRef.current + (now - last));
      last = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= duration) {
        doneRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, duration]);

  const remaining = Math.max(0, duration - elapsed);
  return (
    <div className="max-w-lg mx-auto space-y-1.5" aria-live="off">
      <div
        className="h-1.5 w-full rounded-full bg-[#E1E6EF] overflow-hidden"
        role="progressbar"
        aria-label="Time until a new form opens"
        aria-valuemin={0}
        aria-valuemax={duration / 1000}
        aria-valuenow={Math.ceil(remaining / 1000)}
      >
        <div
          className={`h-full rounded-full ${paused ? 'bg-slate-400' : 'bg-[#16834A]'}`}
          style={{ width: `${(remaining / duration) * 100}%` }}
        />
      </div>
      <p className="text-[length:max(11px,calc(11rem/16))] text-slate-500 text-center">
        {paused ? "Paused" : `Closing in ${Math.ceil(remaining / 1000)}s`}
      </p>
    </div>
  );
};

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="text-xs max-sm:text-[13px] text-[#C62828] mt-1 flex items-start gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>{message}</span>
    </p>
  ) : null;

export const ContactPage: React.FC<ContactPageProps> = ({ bookingIntent, highlightPlaceholders }) => {
  const emptyForm = (): EnquiryFormData => ({
    fullName: '',
    email: '',
    mobileNumber: '',
    whatsappNumber: '',
    goal: '',
    plan: initialPlan(bookingIntent),
    contactMethod: 'WhatsApp',
  });

  /** Copy of the enquiry that was sent, shown in the thank-you popup (the form itself is cleared) */
  const [submitted, setSubmitted] = useState<{
    name: string;
    mobile: string;
    whatsapp: string;
    email: string;
    goal: string;
    plan: string;
    contactMethod: string;
  } | null>(null);

  const [formData, setFormData] = useState<EnquiryFormData>(emptyForm);
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [errors, setErrors] = useState<EnquiryFormErrors>({});
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Success popup timer pauses while a mouse is over the card, or while the card is pressed / held
  const [hoverPaused, setHoverPaused] = useState(false);
  const [pressPaused, setPressPaused] = useState(false);
  const resetPaused = hoverPaused || pressPaused;
  const [honeypot, setHoneypot] = useState('');
  const shownAt = useRef(Date.now());

  const heading = formHeading(bookingIntent);

  // Update a field; once the visitor has tried to submit, re-check errors as they type
  const update = (patch: Partial<EnquiryFormData>, same = sameAsMobile) => {
    const next = { ...formData, ...patch };
    setFormData(next);
    if (triedSubmit) setErrors(validate(next, same));
  };

  const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, PHONE_LEN);

  const turnstileRef = useRef<TurnstileHandle>(null);
  // One id per form fill: a retry or double submit of the same fill is ignored by the server
  const submissionId = useRef(newSubmissionId());
  // Set instantly (state updates wait for a re-render), so a fast double click can't send twice
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setTriedSubmit(true);
    setSubmitError('');
    const found = validate(formData, sameAsMobile);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const turnstileToken = (await turnstileRef.current?.getToken()) ?? '';
      if (isTurnstileConfigured && !turnstileToken) {
        throw new EnquiryError('Please complete the security check above the Submit button.', 'CAPTCHA');
      }
      await submitEnquiry({
        turnstileToken,
        submissionId: submissionId.current,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobileNumber: formData.mobileNumber,
        whatsappNumber: sameAsMobile ? formData.mobileNumber : formData.whatsappNumber,
        goal: formData.goal,
        plan: planLabel(formData.plan),
        contactMethod: formData.contactMethod,
        formTitle: heading.title,
        pageUrl: window.location.href,
        website: honeypot,
        elapsedMs: Date.now() - shownAt.current,
      });
      // Keep what was sent for the popup, then empty the form straight away
      setSubmitted({
        name: formData.fullName.trim(),
        mobile: formData.mobileNumber,
        whatsapp: sameAsMobile ? formData.mobileNumber : formData.whatsappNumber,
        email: formData.email.trim(),
        goal: formData.goal,
        plan: planLabel(formData.plan),
        contactMethod: formData.contactMethod,
      });
      clearForm();
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not send your request. Please try again.');
    } finally {
      // Turnstile tokens work once: get a fresh one for the next attempt
      turnstileRef.current?.reset();
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  /** Empties every field (plan back to "Not sure yet") and starts a new form fill */
  const clearForm = () => {
    setFormData({ ...emptyForm(), plan: '' });
    setSameAsMobile(true);
    setErrors({});
    setTriedSubmit(false);
    setSubmitError('');
    setHoneypot('');
    shownAt.current = Date.now();
    submissionId.current = newSubmissionId();
  };

  /** Closes the thank-you popup (the form was already cleared when the enquiry was accepted) */
  const handleReset = () => {
    setIsSubmitted(false);
    setSubmitted(null);
    setHoverPaused(false);
    setPressPaused(false);
  };

  const whatsapp = sameAsMobile ? formData.mobileNumber : formData.whatsappNumber;

  // Phones and tablets show the form or the plans, one at a time, with a button to switch
  const [mobileView, setMobileView] = useState<'form' | 'plans'>('form');
  const sectionRef = useRef<HTMLElement>(null);

  const switchView = (view: 'form' | 'plans') => {
    setMobileView(view);
    // Bring the top of the card back into view after switching
    requestAnimationFrame(() => {
      const top = sectionRef.current?.getBoundingClientRect().top;
      if (top !== undefined && top < 0) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Success popup: lock page scroll, Escape closes it
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef(handleReset);
  resetRef.current = handleReset;
  useEffect(() => {
    if (!isSubmitted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isSubmitted]);

  // Popup timer pause.
  // Laptops: paused while the mouse is over the card. The popup can open right under a mouse
  // that isn't moving (no "enter" event then), so the last mouse position is remembered and
  // checked when the popup opens.
  // Phones: paused while a finger is on the card. Touch events are used (not pointer events):
  // a finger that moves a little makes the browser cancel the pointer and start scrolling,
  // which used to restart the timer at once; touchend only comes when the finger lifts.
  const popupCardRef = useRef<HTMLDivElement>(null);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    if (!isSubmitted) return;
    const frame = requestAnimationFrame(() => {
      const m = lastMouse.current;
      if (!m || !window.matchMedia('(hover: hover)').matches) return;
      const under = document.elementFromPoint(m.x, m.y);
      if (under && popupCardRef.current?.contains(under)) setHoverPaused(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [isSubmitted]);

  // A press (finger or mouse button) ends wherever it is released
  useEffect(() => {
    if (!pressPaused) return;
    const release = () => setPressPaused(false);
    window.addEventListener('touchend', release);
    window.addEventListener('touchcancel', release);
    window.addEventListener('mouseup', release);
    return () => {
      window.removeEventListener('touchend', release);
      window.removeEventListener('touchcancel', release);
      window.removeEventListener('mouseup', release);
    };
  }, [pressPaused]);

  /** Phone / tablet button that swaps between the form and the plans */
  const switchButton = (to: 'form' | 'plans') => (
    <button
      type="button"
      onClick={() => switchView(to)}
      className="lg:hidden inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-[#1769FF] bg-[#EEF5FF] text-[#1769FF] text-xs font-bold hover:bg-[#1769FF] hover:text-white transition-colors cursor-pointer"
    >
      {to === 'plans' ? <Tag className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
      {to === 'plans' ? 'Plans' : 'Enquiry Form'}
    </button>
  );

  return (
    <div className="bg-white">
      {/* Page Hero */}
      <section className="bg-[#111318] text-white py-8 sm:py-12 lg:py-14 border-b border-[#1C2028]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-2.5 sm:space-y-4">
            <h1 className="text-xl sm:text-3xl lg:text-5xl font-display font-extrabold tracking-tight text-white text-balance">
              Let's Plan Your Fitness Journey
            </h1>
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              Share a few details about your goals and our team can discuss suitable training options with you.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Plans (left) + Enquiry form (right) on desktop.
          Phones and tablets: the form first; the "Plans" button swaps it for the plan list and back. */}
      <section ref={sectionRef} className="scroll-mt-28 py-8 sm:py-12 lg:py-14 border-b border-[#E1E6EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
            <div className={`lg:col-span-5 ${mobileView === 'plans' ? '' : 'max-lg:hidden'}`}>
              <EnquiryPlanPanel
                intent={bookingIntent}
                selectedPlan={formData.plan}
                onSelectPlan={(plan) => {
                  update({ plan });
                  // Phones / tablets: back to the form with the plan selected
                  if (window.matchMedia('(max-width: 1023.98px)').matches) switchView('form');
                }}
                headerAction={switchButton('form')}
              />
            </div>

            <div className={`lg:col-span-7 ${mobileView === 'form' ? '' : 'max-lg:hidden'}`}>
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E1E6EF] p-4 sm:p-6 lg:p-8 shadow-sm">
                {/* Enquiry form: 6 fields + preferred contact method */}
                <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6" aria-busy={isSubmitting}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1769FF] uppercase tracking-wider">Enquiry Form</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</span>
                        {switchButton('plans')}
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-[#171A21] mt-1">{heading.title}</h2>
                    <p className="text-xs sm:text-sm text-[#646B78] mt-1">{heading.sub}</p>
                  </div>

                  {/* Fields are locked while the request is being sent */}
                  <fieldset disabled={isSubmitting} className="min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. Name (required) */}
                        <div>
                          <label htmlFor="fullName" className="block text-xs max-sm:text-[13px] font-semibold text-[#171A21] mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            autoComplete="name"
                            maxLength={NAME_MAX}
                            value={formData.fullName}
                            onChange={(e) => update({ fullName: e.target.value })}
                            placeholder="e.g. Rahul Patil"
                            aria-invalid={!!errors.fullName}
                            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                            className={inputClass(!!errors.fullName)}
                          />
                          <FieldError id="fullName-error" message={errors.fullName} />
                        </div>

                        {/* 2. Email (optional) */}
                        <div>
                          <label htmlFor="email" className="block text-xs max-sm:text-[13px] font-semibold text-[#171A21] mb-1.5">
                            Email <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            id="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            maxLength={EMAIL_MAX}
                            value={formData.email}
                            onChange={(e) => update({ email: e.target.value })}
                            placeholder="rahul@example.com"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            className={inputClass(!!errors.email)}
                          />
                          <FieldError id="email-error" message={errors.email} />
                        </div>

                        {/* 3. Mobile number (required, 10 digits) */}
                        <div>
                          <label htmlFor="mobileNumber" className="block text-xs max-sm:text-[13px] leading-4 font-semibold text-[#171A21] mb-1.5">
                            Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs max-sm:text-[15px] font-semibold text-slate-500">+91</span>
                            <input
                              id="mobileNumber"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              maxLength={PHONE_LEN}
                              value={formData.mobileNumber}
                              onChange={(e) => update({ mobileNumber: digitsOnly(e.target.value) })}
                              placeholder="98765 43210"
                              aria-invalid={!!errors.mobileNumber}
                              aria-describedby={errors.mobileNumber ? 'mobileNumber-error' : undefined}
                              className={`${inputClass(!!errors.mobileNumber)} pl-12 max-sm:pl-[52px]`}
                            />
                          </div>
                          <FieldError id="mobileNumber-error" message={errors.mobileNumber} />
                        </div>

                        {/* 4. WhatsApp number (required, 10 digits; can copy mobile) */}
                        <div>
                          {/* Same line height as the Mobile Number label, so both fields line up side by side.
                              The checkbox is the size of its text (1em). */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label htmlFor="whatsappNumber" className="block text-xs max-sm:text-[13px] leading-4 font-semibold text-[#171A21]">
                              WhatsApp Number <span className="text-red-500">*</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-xs max-sm:text-[13px] leading-4 text-[#646B78] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sameAsMobile}
                                onChange={(e) => {
                                  setSameAsMobile(e.target.checked);
                                  update({}, e.target.checked);
                                }}
                                className="w-[1em] h-[1em] m-0 rounded-sm text-[#1769FF] border-slate-300 focus:ring-[#1769FF] cursor-pointer"
                              />
                              Same as mobile
                            </label>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs max-sm:text-[15px] font-semibold text-slate-500">+91</span>
                            <input
                              id="whatsappNumber"
                              type="tel"
                              inputMode="numeric"
                              maxLength={PHONE_LEN}
                              value={whatsapp}
                              disabled={sameAsMobile}
                              onChange={(e) => update({ whatsappNumber: digitsOnly(e.target.value) })}
                              placeholder="98765 43210"
                              aria-invalid={!!errors.whatsappNumber}
                              aria-describedby={errors.whatsappNumber ? 'whatsappNumber-error' : undefined}
                              className={`${inputClass(!!errors.whatsappNumber)} pl-12 max-sm:pl-[52px]`}
                            />
                          </div>
                          <FieldError id="whatsappNumber-error" message={errors.whatsappNumber} />
                        </div>

                        {/* 5. Goal (optional) */}
                        <div>
                          <label htmlFor="goal" className="block text-xs max-sm:text-[13px] font-semibold text-[#171A21] mb-1.5">
                            Your Goal <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <FormSelect
                            id="goal"
                            value={formData.goal}
                            onChange={(goal) => update({ goal })}
                            disabled={isSubmitting}
                            placeholder
                            groups={GOAL_GROUPS}
                          />
                        </div>

                        {/* 6. Plan (optional; preselected from the button clicked) */}
                        <div>
                          <label htmlFor="plan" className="block text-xs max-sm:text-[13px] font-semibold text-[#171A21] mb-1.5">
                            Plan <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <FormSelect
                            id="plan"
                            value={formData.plan}
                            onChange={(plan) => update({ plan })}
                            disabled={isSubmitting}
                            groups={PLAN_GROUPS}
                          />
                        </div>

                        {/* Contact preference: the label and three round icons (Phone Call, WhatsApp – the
                            default – and Email) on one line. The chosen icon is filled; no name is shown
                            (each icon has a tooltip and an accessible name). */}
                        <div className="sm:col-span-2 flex items-center justify-between gap-3">
                          <span id="contact-way-label" className="min-w-0 text-xs max-sm:text-[13px] font-semibold text-[#171A21]">
                            Contact Preference
                          </span>
                          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0" role="radiogroup" aria-labelledby="contact-way-label">
                            {CONTACT_METHODS.map((method) => {
                              const isChosen = formData.contactMethod === method;
                              const isWhatsApp = method === 'WhatsApp';
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  role="radio"
                                  aria-checked={isChosen}
                                  aria-label={method}
                                  title={method}
                                  onClick={() => update({ contactMethod: method })}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1769FF] ${
                                    isChosen
                                      ? isWhatsApp
                                        ? 'bg-[#25D366] border-[#25D366] text-white shadow-md shadow-[#25D366]/30 scale-105'
                                        : 'bg-[#1769FF] border-[#1769FF] text-white shadow-md shadow-[#1769FF]/30 scale-105'
                                      : isWhatsApp
                                        ? 'bg-white border-[#E1E6EF] text-[#25D366] hover:border-[#25D366]'
                                        : 'bg-white border-[#E1E6EF] text-slate-500 hover:border-[#1769FF] hover:text-[#1769FF]'
                                  }`}
                                >
                                  {method === 'Phone Call' && <Phone className="w-4 h-4" />}
                                  {isWhatsApp && <WhatsAppIcon className="w-4 h-4" />}
                                  {method === 'Email' && <Mail className="w-4 h-4" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Honeypot: hidden from people, bots fill it in */}
                      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                        <label htmlFor="website">Website</label>
                        <input
                          id="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </div>

                  </fieldset>

                  <div>
                      {/* Bot check: invisible unless Cloudflare asks for a click */}
                      <Turnstile ref={turnstileRef} className="mb-3 empty:hidden" />
                      {submitError && (
                        <div role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C62828] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            {submitError} You can also call us at{' '}
                            <a href={`tel:${BUSINESS_INFO.contact.phoneRaw}`} className="font-semibold underline">
                              {BUSINESS_INFO.contact.phone}
                            </a>
                            .
                          </span>
                        </div>
                      )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 sm:py-3.5 px-4 sm:px-5 min-h-[44px] max-sm:min-h-[48px] text-xs max-sm:text-[15px] sm:text-sm font-bold text-white bg-[#1769FF] hover:bg-[#0B3D91] active:scale-[0.99] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-wait disabled:bg-[#0B3D91]"
                    >
                      {isSubmitting ? (
                        // While sending: only a spinner (no bar, no text)
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          <span className="sr-only">Sending your request</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                    <p className="text-[length:max(10px,calc(10rem/16))] sm:text-[length:max(11px,calc(11rem/16))] text-center text-slate-400 mt-2">
                      By submitting, you agree to be contacted by TeamSamir about this request. No spam.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success popup (centre of the screen): green celebration, the submitted details and a
          5-second bar below them; then it closes and a fresh form is ready. Hover or press pauses. */}
      {isSubmitted && (
        <>
          <GreenConfetti />
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-2.5 sm:p-4 bg-[#0B1220]/60 backdrop-blur-sm enquiry-fade"
            onClick={(e) => e.target === e.currentTarget && handleReset()}
          >
            <div
              ref={popupCardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="enquiry-success-title"
              className="w-full max-w-[38.4rem] max-h-[90svh] overflow-y-auto rounded-3xl bg-white shadow-2xl border-t-4 border-[#16834A] p-5 sm:p-7 space-y-5 text-center enquiry-pop"
              // The 5 s bar stops while a mouse is over the card (laptops) and while a finger or
              // mouse button is held on it (any device); it carries on when the mouse leaves or
              // the press ends. Only real mouse pointers count as hover (phones send fake mouse
              // events after a tap, which must not leave the popup paused).
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverPaused(true)}
              onPointerMove={(e) => e.pointerType === 'mouse' && !hoverPaused && setHoverPaused(true)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setHoverPaused(false)}
              onTouchStart={() => setPressPaused(true)}
              onPointerDown={(e) => e.pointerType === 'mouse' && setPressPaused(true)}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#16834A] flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 id="enquiry-success-title" className="text-2xl sm:text-3xl font-display font-bold text-[#16834A]">
                  Thank You, {submitted?.name}!
                </h3>
                <p className="text-sm text-[#646B78] leading-relaxed">
                  We have your request. Our team will contact you by <strong className="text-[#171A21]">{submitted?.contactMethod}</strong> soon.
                </p>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5 text-left text-xs space-y-2.5">
                <div className="text-xs font-bold text-[#16834A] uppercase tracking-wider pb-1 border-b border-emerald-200">
                  Your Request
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Name:</strong> {submitted?.name}</div>
                  <div><strong>Mobile:</strong> +91 {submitted?.mobile}</div>
                  <div><strong>WhatsApp:</strong> +91 {submitted?.whatsapp}</div>
                  <div className="break-all"><strong>Email:</strong> {submitted?.email || '—'}</div>
                  <div><strong>Goal:</strong> {submitted?.goal || '—'}</div>
                  <div><strong>Contact by:</strong> {submitted?.contactMethod}</div>
                  <div className="sm:col-span-2"><strong>Plan:</strong> {submitted?.plan}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-left text-[length:max(11px,calc(11rem/16))] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#16834A] shrink-0" />
                <p>Your details are shared only with TeamSamir's Staff & used only to contact you about this request.</p>
              </div>

              {/* 5-second bar, below the details */}
              <AutoResetBar duration={SUCCESS_RESET_MS} paused={resetPaused} onDone={handleReset} />

              <button
                ref={closeButtonRef}
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#16834A] text-white font-semibold text-xs hover:bg-[#0F6B3A] transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Submit Another Request</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Section 2: Trainer & Location Info (horizontal) */}
      <section className="py-8 sm:py-12 lg:py-14 bg-slate-50 border-b border-[#E1E6EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#1769FF] uppercase tracking-wider mb-1">Connect Directly</div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-[#171A21] tracking-tight">
                Trainer & Location Info
              </h2>
            </div>
            <a
              href={`tel:${BUSINESS_INFO.contact.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#EEF5FF] text-[#171A21] border border-[#E1E6EF] hover:border-[#1769FF] text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Phone className="w-4 h-4 text-[#1769FF]" />
              <span>Call {BUSINESS_INFO.contact.phone}</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Contact details: 2-column grid of items */}
            <div
              className={`lg:col-span-6 p-5 sm:p-6 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 transition-all ${
                highlightPlaceholders ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300' : 'bg-white border-[#E1E6EF] shadow-xs'
              }`}
            >
              <InfoItem icon={<Sparkles className="w-4 h-4" />} label="Head Trainer & Founder" accent>
                <div className="text-sm font-bold text-[#171A21]">TeamSamir</div>
                <div className="text-xs text-[#646B78]">{BUSINESS_INFO.experienceYears}+ Years Experience · Former Coach at Fitness Talk</div>
              </InfoItem>

              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Studio Location">
                <div className="text-sm font-semibold text-[#171A21]">{BUSINESS_INFO.location.fullAddress}</div>
                <p className="text-[length:max(11px,calc(11rem/16))] text-slate-500 mt-0.5">Kothrud, Pune, Maharashtra 411038</p>
              </InfoItem>

              <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone Number">
                <a href={`tel:${BUSINESS_INFO.contact.phoneRaw}`} className="inline-block py-1 lg:py-0 text-sm font-medium text-slate-900 hover:text-[#1769FF] transition-colors">
                  {BUSINESS_INFO.contact.phone}
                </a>
              </InfoItem>

              <InfoItem icon={<MessageSquare className="w-4 h-4" />} label="WhatsApp Business" green>
                <a
                  href={`https://wa.me/${BUSINESS_INFO.contact.whatsappNumber}?text=${encodeURIComponent(
                    BUSINESS_INFO.contact.whatsappMessage
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1 lg:py-0 text-sm font-medium text-[#16834A] hover:underline"
                >
                  {BUSINESS_INFO.contact.whatsapp} (Direct Chat)
                </a>
              </InfoItem>

              <InfoItem icon={<Mail className="w-4 h-4" />} label="Email Address">
                <a href={`mailto:${BUSINESS_INFO.contact.email}`} className="inline-block py-1 lg:py-0 text-sm font-medium text-slate-900 break-all hover:text-[#1769FF] transition-colors">
                  {BUSINESS_INFO.contact.email}
                </a>
              </InfoItem>

              <InfoItem icon={<Clock className="w-4 h-4" />} label="Operating Hours">
                <div className="text-xs font-medium text-slate-800">{BUSINESS_INFO.contact.workingHours}</div>
              </InfoItem>
            </div>

            {/* Live Google Map */}
            <div className="lg:col-span-6 rounded-2xl border border-[#E1E6EF] bg-white p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#171A21]">Near Ashish Garden Banquet Hall</h3>
                  <p className="text-xs text-[#646B78] mt-1">Kothrud, Pune, Maharashtra</p>
                </div>
                <Navigation className="w-5 h-5 text-[#1769FF] shrink-0" />
              </div>
              <div className="relative w-full flex-1 min-h-[220px] rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  title="Ashish Garden Banquet Hall Location"
                  src="https://maps.google.com/maps?q=18.5026368,73.8025847&z=17&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, position: 'absolute', inset: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href="https://www.google.com/maps/place/Ashish+Garden+Banquet+Hall/@18.5026368,73.8025847,17z"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1769FF] hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span>Get Directions on Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/** One labelled row in the Trainer & Location card */
const InfoItem: React.FC<{ icon: React.ReactNode; label: string; accent?: boolean; green?: boolean; children: React.ReactNode }> = ({
  icon,
  label,
  accent,
  green,
  children,
}) => (
  <div className="flex items-start gap-3">
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        green ? 'bg-emerald-50 text-[#16834A]' : 'bg-[#EEF5FF] text-[#1769FF]'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <span className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-[#1769FF]' : 'text-slate-500'}`}>{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  </div>
);
