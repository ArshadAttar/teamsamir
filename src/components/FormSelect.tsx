import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  /** Text in the open list */
  label: string;
  /** Text on the closed field when this option is chosen (defaults to `label`) */
  selectedLabel?: string;
}

export interface SelectGroup {
  /** Small heading above the group's options */
  label?: string;
  options: SelectOption[];
}

interface FormSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  groups: SelectGroup[];
  /** Grey text on the closed field while value is '' */
  placeholder?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

/** Bottom bar on phones and tablets (MobileBottomBar) covers this much of the screen */
const BOTTOM_BAR = 72;

/**
 * Drop-down that opens right under the field on every device, instead of the phone's
 * built-in full-screen picker. Small text so long choices fit on one line; plans are
 * grouped under their service. Keyboard: arrows, Home/End, Enter/Space to choose,
 * Escape/Tab to close. Clicking outside closes it.
 */
export const FormSelect: React.FC<FormSelectProps> = ({ id, value, onChange, groups, placeholder, hasError, disabled }) => {
  const [open, setOpen] = useState(false);
  const flat = groups.flatMap((g) => g.options);
  const selectedIndex = Math.max(0, flat.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selectedIndex);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const selected = flat[selectedIndex];

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i: number) => {
    onChange(flat[i].value);
    setOpen(false);
  };

  // Close on a click / tap outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // On open: show the chosen option inside the list and bring the whole list on screen
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const opt = document.getElementById(optionId(selectedIndex));
    if (opt) list.scrollTop = opt.offsetTop - list.clientHeight / 2 + opt.offsetHeight / 2;
    const rect = list.getBoundingClientRect();
    const limit = window.innerHeight - (window.innerWidth < 1024 ? BOTTOM_BAR : 12);
    if (rect.bottom > limit) window.scrollBy({ top: rect.bottom - limit + 8, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const opt = document.getElementById(optionId(active));
    if (!list || !opt) return;
    if (opt.offsetTop < list.scrollTop) list.scrollTop = opt.offsetTop;
    else if (opt.offsetTop + opt.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = opt.offsetTop + opt.offsetHeight - list.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  let index = -1;
  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-invalid={hasError || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[42px] sm:min-h-[44px] text-left text-[13px] sm:text-sm rounded-xl border bg-white transition-all cursor-pointer focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          hasError
            ? 'border-[#C62828] focus:ring-[#C62828]/20'
            : open
              ? 'border-[#1769FF] ring-2 ring-[#1769FF]/20'
              : 'border-[#E1E6EF] focus:ring-[#1769FF]/20 focus:border-[#1769FF]'
        }`}
      >
        <span className={`truncate ${placeholder && !value ? 'text-slate-400' : 'text-[#171A21]'}`}>
          {selected?.selectedLabel ?? selected?.label}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-[#1769FF]' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-[min(18rem,55svh)] overflow-y-auto overscroll-contain rounded-xl border border-[#E1E6EF] bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(17,19,24,0.35)]"
        >
          {groups.map((group, g) => (
            <li key={g} role="presentation">
              {group.label && (
                <div className="px-3 pt-2.5 pb-1 text-[length:max(10.5px,calc(10.5rem/16))] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
              )}
              <ul role="group" aria-label={group.label}>
                {group.options.map((opt) => {
                  index += 1;
                  const i = index;
                  const isSelected = opt.value === value;
                  return (
                    <li
                      key={opt.value || `empty-${g}`}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(i)}
                      onPointerMove={() => setActive(i)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-[13px] sm:text-sm cursor-pointer ${
                        group.label ? 'pl-5' : ''
                      } ${i === active ? 'bg-[#EEF5FF]' : ''} ${isSelected ? 'text-[#1769FF] font-semibold' : 'text-[#171A21]'}`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
