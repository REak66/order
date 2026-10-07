import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Trash2, Plus } from 'lucide-react';
import { cn } from '../utils/cx';

/**
 * Reusable CreatableSelect component with inline add and delete capabilities.
 * Designed for Position, Department, and category selectors where users can dynamically
 * choose, add, or delete options.
 */
const CreatableSelect = ({
  label,
  placeholder = 'Select option...',
  options = [],
  value = '',
  onChange,
  onAddNew,
  onDelete,
  disabled = false,
  className = '',
  addNewLabel = 'Add New...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  const handleClickOutside = useCallback((event) => {
    if (containerRef.current && !containerRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value ?? opt.name ?? '', label: opt.label ?? opt.name ?? '' };
    }
    return { value: String(opt), label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (value || '');

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition text-sm text-left pr-8 relative font-semibold shadow-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/60 flex justify-between items-center cursor-pointer min-h-[46px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={displayLabel ? "text-slate-800 dark:text-slate-200 font-semibold truncate" : "text-slate-400 dark:text-slate-500 font-normal truncate"}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Default / Clear selection option */}
          <div
            onClick={() => {
              onChange?.('');
              setIsOpen(false);
            }}
            className={cn(
              "text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors px-3 py-2 flex items-center justify-between cursor-pointer",
              !value ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-semibold" : "text-slate-700 dark:text-slate-300"
            )}
          >
            <span className="truncate">{placeholder}</span>
            {!value && <Check size={16} className="text-primary-600 dark:text-primary-400 shrink-0" />}
          </div>

          {/* Option list */}
          {normalizedOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange?.(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors px-3 py-2 flex items-center justify-between cursor-pointer group",
                  isSelected
                    ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300"
                )}
              >
                <span className="truncate pr-2">{opt.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(opt.value);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title={`Delete ${opt.label}`}
                      aria-label={`Delete ${opt.label}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {isSelected && (
                    <Check size={16} className="text-primary-600 dark:text-primary-400 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Action */}
          {onAddNew && (
            <div className="border-t border-slate-100 dark:border-slate-800/60 my-1 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onAddNew();
                  setIsOpen(false);
                }}
                className="w-full text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-xl transition-colors px-3 py-2 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableSelect;
