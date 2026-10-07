import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle,
  X,
  Zap,
  CalendarRange,
  CalendarDays
} from 'lucide-react';
import {
  format,
  parseISO,
  isValid,
  isWeekend,
  addDays,
  endOfMonth,
  startOfMonth,
  addMonths,
  eachDayOfInterval,
  isBefore
} from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import SelectDate from './SelectDate';
import { cn } from '../utils/cx';

/**
 * Reusable responsive modal SelectDateRange component.
 * Opens as a full-featured responsive dialog with backdrop blur,
 * scrollable body, and sticky actions so it never overflows small screens (like iPhone SE).
 * 
 * Props:
 * - startDate: 'YYYY-MM-DD'
 * - endDate: 'YYYY-MM-DD'
 * - onApply: ({ startDate, endDate, dates: string[], excludeWeekends: boolean }) => void
 * - excludeWeekendsDefault: boolean (default true)
 * - min: string ('YYYY-MM-DD')
 * - className: string
 * - align: 'left' | 'right' (maintained for prop compatibility)
 */
const SelectDateRange = ({
  startDate = '',
  endDate = '',
  onApply,
  excludeWeekendsDefault = true,
  min = '',
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [excludeWeekends, setExcludeWeekends] = useState(excludeWeekendsDefault);

  // Sync internal state when props change or modal opens
  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate) setTempEnd(endDate);
  }, [startDate, endDate]);

  const handleOpen = () => {
    setTempStart(startDate || min || '');
    setTempEnd(endDate || '');
    setExcludeWeekends(excludeWeekendsDefault);
    setIsOpen(true);
  };

  const handleClose = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsOpen(false);
  };

  // Body scroll lock & Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, startDate, endDate]);

  // Compute calculated dates from tempStart and tempEnd
  const computedDates = useMemo(() => {
    if (!tempStart || !tempEnd) return [];
    try {
      const s = parseISO(tempStart);
      const e = parseISO(tempEnd);
      if (!isValid(s) || !isValid(e) || isBefore(e, s)) return [];

      return eachDayOfInterval({ start: s, end: e })
        .filter(d => !excludeWeekends || !isWeekend(d))
        .map(d => format(d, 'yyyy-MM-dd'));
    } catch {
      return [];
    }
  }, [tempStart, tempEnd, excludeWeekends]);

  // Preset Handlers
  const applyPresetNext5Workdays = () => {
    const startDay = min ? parseISO(min) : addDays(new Date(), 1);
    let days = [];
    let curr = isValid(startDay) ? startDay : addDays(new Date(), 1);
    while (days.length < 5) {
      if (!isWeekend(curr)) {
        days.push(curr);
      }
      curr = addDays(curr, 1);
    }
    setTempStart(format(days[0], 'yyyy-MM-dd'));
    setTempEnd(format(days[days.length - 1], 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetNext2Weeks = () => {
    const startDay = min ? parseISO(min) : addDays(new Date(), 1);
    let days = [];
    let curr = isValid(startDay) ? startDay : addDays(new Date(), 1);
    while (days.length < 10) {
      if (!isWeekend(curr)) {
        days.push(curr);
      }
      curr = addDays(curr, 1);
    }
    setTempStart(format(days[0], 'yyyy-MM-dd'));
    setTempEnd(format(days[days.length - 1], 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetRestOfMonth = () => {
    const startDay = min ? parseISO(min) : addDays(new Date(), 1);
    const validStart = isValid(startDay) ? startDay : addDays(new Date(), 1);
    const end = endOfMonth(validStart);
    setTempStart(format(validStart, 'yyyy-MM-dd'));
    setTempEnd(format(end, 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetNextMonth = () => {
    const nextMonth = addMonths(new Date(), 1);
    const start = startOfMonth(nextMonth);
    const end = endOfMonth(nextMonth);
    setTempStart(format(start, 'yyyy-MM-dd'));
    setTempEnd(format(end, 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const handleApply = () => {
    if (!tempStart || !tempEnd) return;
    if (onApply) {
      onApply({
        startDate: tempStart,
        endDate: tempEnd,
        dates: computedDates,
        excludeWeekends
      });
    }
    setIsOpen(false);
  };

  const displayButtonLabel = () => {
    if (startDate && endDate) {
      try {
        const s = parseISO(startDate);
        const e = parseISO(endDate);
        if (isValid(s) && isValid(e)) {
          const sameYear = s.getFullYear() === e.getFullYear();
          return sameYear
            ? `${format(s, 'MMM dd')} - ${format(e, 'MMM dd')}`
            : `${format(s, 'MMM dd, yyyy')} - ${format(e, 'MMM dd, yyyy')}`;
        }
      } catch {
        return `${startDate} - ${endDate}`;
      }
    }
    return 'Select Date Range';
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none transition text-xs sm:text-sm text-slate-700 dark:text-slate-200 text-left font-medium shadow-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon size={15} className={cn("text-slate-400 dark:text-slate-500 transition-colors shrink-0", isOpen && "text-primary-500 dark:text-primary-400")} />
          <span className="truncate">{displayButtonLabel()}</span>
        </span>
        <ChevronDown size={15} className="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Modal Dialog Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs"
                onClick={handleClose}
                aria-hidden="true"
              />

              {/* Responsive Modal Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="date-range-modal-title"
                className="relative w-full sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10 overflow-hidden my-0 sm:my-auto"
              >
                {/* Mobile Drag Indicator */}
                <div className="pt-2.5 sm:hidden flex justify-center">
                  <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Modal Header (Sticky) */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 shrink-0">
                      <CalendarRange size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 id="date-range-modal-title" className="text-sm sm:text-base font-bold text-slate-800 dark:text-white tracking-tight truncate">
                        Order Date Range Picker
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        Select start and end dates to order across multiple days
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
                    aria-label="Close dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="px-4 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                  {/* Quick Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Quick Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={applyPresetNext5Workdays}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                      >
                        <Zap size={13} className="text-amber-500 shrink-0" />
                        <span>5 Workdays</span>
                      </button>
                      <button
                        type="button"
                        onClick={applyPresetNext2Weeks}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                      >
                        <CalendarRange size={13} className="text-blue-500 shrink-0" />
                        <span>2 Weeks</span>
                      </button>
                      <button
                        type="button"
                        onClick={applyPresetRestOfMonth}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                      >
                        <CalendarIcon size={13} className="text-emerald-500 shrink-0" />
                        <span>This Month</span>
                      </button>
                      <button
                        type="button"
                        onClick={applyPresetNextMonth}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                      >
                        <CalendarDays size={13} className="text-violet-500 shrink-0" />
                        <span>Next Month</span>
                      </button>
                    </div>
                  </div>

                  {/* Start & End Date Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Start Date
                      </label>
                      <SelectDate
                        value={tempStart}
                        onChange={(e) => {
                          setTempStart(e.target.value);
                          if (tempEnd && e.target.value > tempEnd) {
                            setTempEnd(e.target.value);
                          }
                        }}
                        min={min}
                        placeholder="Start date"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        End Date
                      </label>
                      <SelectDate
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        min={tempStart || min}
                        placeholder="End date"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Options & Working Days Switch */}
                  <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Exclude Weekends (Mon-Fri only)
                      </span>
                      <p className="text-[11px] text-slate-400">Skip Saturdays & Sundays automatically</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={excludeWeekends}
                        onChange={(e) => setExcludeWeekends(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {/* Selection Summary Pill */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Selected Days:</span>
                    <span className={cn(
                      "font-bold px-2.5 py-0.5 rounded-full text-xs",
                      computedDates.length > 0
                        ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50"
                        : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {computedDates.length > 0 ? `${computedDates.length} Days Selected` : 'None'}
                    </span>
                  </div>
                </div>

                {/* Modal Footer (Sticky) */}
                <div className="px-4 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempStart('');
                      setTempEnd('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer sm:hidden"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={computedDates.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Apply Range ({computedDates.length} {computedDates.length === 1 ? 'day' : 'days'})</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SelectDateRange;
