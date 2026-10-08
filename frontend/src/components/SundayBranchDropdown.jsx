import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cx';

export const AVAILABLE_SUNDAY_BRANCHES = [
  { id: 'BYD 60M', name: 'BYD 60M', description: '60M Branch Staff' },
  { id: 'City Mall', name: 'City Mall', description: 'City Mall Branch Staff' },
  { id: 'BYD 6A', name: 'BYD 6A', description: '6A Branch Staff' }
];

export const parseSundayBranches = (val) => {
  if (val === undefined || val === null) return ['BYD 60M'];
  if (typeof val === 'string' && val.trim() === '') return [];
  try {
    if (typeof val === 'string' && val.startsWith('[')) return JSON.parse(val);
  } catch {}
  return String(val)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
};

/**
 * SundayBranchDropdown Component
 * Matches the standard form input height, styling, and design system (SelectDate, TimePicker, etc.)
 * Provides a clean multi-select dropdown popover for admin branch authorization on Sundays.
 */
const SundayBranchDropdown = ({
  value = 'BYD 60M',
  onChange,
  disabled = false,
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 340 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedBranches = parseSundayBranches(value);

  // Position calculation relative to viewport
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = Math.max(rect.width, 320);
    const popupHeight = 270;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < popupHeight && rect.top > popupHeight;

    let top = openUpwards
      ? Math.max(8, rect.top - popupHeight - 8)
      : Math.min(window.innerHeight - popupHeight - 8, rect.bottom + 8);

    top = Math.max(8, Math.min(window.innerHeight - popupHeight - 8, top));

    let left = align === 'right' ? rect.right - popupWidth : rect.left;

    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left, width: Math.min(popupWidth, window.innerWidth - 24) });
  }, [align]);

  // Update position when opened, resized, or scrolled
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (branchName) => {
    let updated;
    if (selectedBranches.includes(branchName)) {
      updated = selectedBranches.filter(b => b !== branchName);
    } else {
      updated = [...selectedBranches, branchName];
    }
    onChange?.(updated.join(','));
  };

  const handlePreset = (branchList) => {
    onChange?.(branchList.join(','));
  };

  const isAll = selectedBranches.length === AVAILABLE_SUNDAY_BRANCHES.length;
  const isOnly60M = selectedBranches.length === 1 && selectedBranches[0] === 'BYD 60M';
  const isNone = selectedBranches.length === 0;

  return (
    <div className={cn("relative inline-block w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updatePosition();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "w-full h-10 sm:h-10.5 min-h-[40px] sm:min-h-[42px] flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5",
          "bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl",
          "outline-none transition text-xs sm:text-sm text-slate-700 dark:text-slate-200 text-left font-medium shadow-xs",
          "hover:bg-slate-100/50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate flex-1">
          <Building2
            size={15}
            className={cn(
              "text-slate-400 dark:text-slate-500 transition-colors shrink-0",
              isOpen && "text-primary-500 dark:text-primary-400"
            )}
          />
          {isNone ? (
            <span className="text-rose-500 dark:text-rose-400 font-semibold truncate">
              All Blocked (No Branch)
            </span>
          ) : isAll ? (
            <span className="text-slate-700 dark:text-slate-200 font-semibold truncate">
              All Branches Allowed
            </span>
          ) : isOnly60M ? (
            <span className="inline-flex items-center gap-1.5 truncate">
              <span className="font-bold text-primary-600 dark:text-primary-400">BYD 60M</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                Default
              </span>
            </span>
          ) : (
            <span className="font-bold text-primary-600 dark:text-primary-400 truncate">
              {selectedBranches.join(', ')}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5 shrink-0 ml-1">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
              isNone
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                : "bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 border-primary-200 dark:border-primary-800"
            )}
          >
            {isNone ? '0' : selectedBranches.length}
          </span>
          <ChevronDown
            size={15}
            className={cn(
              "text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0",
              isOpen && "rotate-180 text-primary-500 dark:text-primary-400"
            )}
          />
        </span>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop catcher */}
                <div
                  className="fixed inset-0 z-[99998] bg-black/10 sm:bg-transparent"
                  onClick={() => setIsOpen(false)}
                  aria-hidden="true"
                />

                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    position: 'fixed',
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    width: `${coords.width}px`,
                    zIndex: 99999
                  }}
                  className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl space-y-2.5"
                >
                  {/* Preset quick buttons */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Quick Presets
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePreset(['BYD 60M'])}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-semibold rounded-md border transition cursor-pointer",
                          isOnly60M
                            ? "bg-primary-600 text-white border-primary-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        60M Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset(AVAILABLE_SUNDAY_BRANCHES.map(b => b.name))}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-semibold rounded-md border transition cursor-pointer",
                          isAll
                            ? "bg-primary-600 text-white border-primary-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset([])}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-semibold rounded-md border transition cursor-pointer",
                          isNone
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  {/* Branch options checkboxes */}
                  <div className="space-y-1">
                    {AVAILABLE_SUNDAY_BRANCHES.map((b) => {
                      const isSelected = selectedBranches.includes(b.name);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleToggle(b.name)}
                          className={cn(
                            "w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer group",
                            isSelected
                              ? "bg-primary-50/70 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800/80 shadow-2xs"
                              : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all shrink-0",
                                isSelected
                                  ? "bg-primary-600 border-primary-600 text-white shadow-xs"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-slate-400"
                              )}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "text-xs sm:text-sm font-bold truncate",
                                    isSelected
                                      ? "text-primary-700 dark:text-primary-300"
                                      : "text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  {b.name}
                                </span>
                                {b.name === 'BYD 60M' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {b.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Popover footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mr-2">
                      Allowed on Sunday:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isNone ? 'None (Blocked)' : selectedBranches.join(', ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-xs transition cursor-pointer shrink-0"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default SundayBranchDropdown;
