import React, { useEffect, useRef } from 'react';

/**
 * Reusable premium SearchSelect component powered by FlyonUI's HSSelect.
 * Supports searching, custom styling, React controlled state, and automatic cleanup.
 */
const SearchSelect = ({
  options = [], // [{ value: '...', label: '...' }]
  value = '',
  onChange,
  placeholder = 'Select option...',
  searchLimit = 5,
  hasSearch = true,
  className = '',
  disabled = false,
}) => {
  const selectRef = useRef(null);
  const onChangeRef = useRef(onChange);

  // Keep ref up to date with latest onChange prop
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize and autoInit HSSelect
  useEffect(() => {
    if (!selectRef.current) return;
    const selectEl = selectRef.current;

    // Run FlyonUI Select autoInit to discover and build the custom dropdown UI
    if (window.HSSelect) {
      window.HSSelect.autoInit();
    }

    // Set initial value in FlyonUI instance if available
    setTimeout(() => {
      if (window.HSSelect) {
        const instance = window.HSSelect.getInstance(selectEl);
        if (instance && value) {
          instance.setValue(value);
        }
      }
    }, 50);

    // Propagate native change event to the React onChange callback
    const handleNativeChange = (e) => {
      if (onChangeRef.current) {
        onChangeRef.current(e);
      }
    };

    selectEl.addEventListener('change', handleNativeChange);

    return () => {
      selectEl.removeEventListener('change', handleNativeChange);
      // Clean up the custom FlyonUI elements and restore the original select element
      if (window.HSSelect) {
        const instance = window.HSSelect.getInstance(selectEl);
        if (instance) {
          instance.destroy();
        }
      }
    };
  }, [options, hasSearch, searchLimit, placeholder]);

  // Sync external React state value changes to FlyonUI's dropdown UI
  useEffect(() => {
    if (selectRef.current && window.HSSelect) {
      const instance = window.HSSelect.getInstance(selectRef.current);
      if (instance) {
        // If the value is different from FlyonUI's internal value, sync it
        if (instance.value !== value) {
          instance.setValue(value);
        }
      }
    }
  }, [value]);

  // Sync disabled state
  useEffect(() => {
    if (selectRef.current && window.HSSelect) {
      const instance = window.HSSelect.getInstance(selectRef.current);
      if (instance) {
        instance.setDisabledState(disabled);
      }
    }
  }, [disabled]);

  // JSON configuration required by FlyonUI data-select attribute
  const dataSelectConfig = {
    hasSearch: hasSearch,
    searchLimit: searchLimit,
    placeholder: placeholder,
    dropdownScope: 'window', // Portal style positioning using fixed layout to escape overflow clipping in tables
    toggleTag: '<button type="button" aria-expanded="false"></button>',
    toggleClasses: 'advance-select-toggle select-disabled:pointer-events-none select-disabled:opacity-40 w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition text-sm text-slate-700 dark:text-slate-200 text-left pr-8 relative font-medium shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/60',
    dropdownClasses: 'advance-select-menu max-h-52 pt-0 overflow-y-auto w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-[9999] p-1.5',
    optionClasses: 'advance-select-option selected:select-active text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors px-3 py-2 flex items-center justify-between selected:bg-primary-50 dark:selected:bg-primary-950/30 selected:text-primary-600 dark:selected:text-primary-400',
    optionTemplate: '<div class="flex justify-between items-center w-full"><span data-title></span><svg class="shrink-0 size-4 text-primary hidden selected:block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>',
    extraMarkup: '<svg class="shrink-0 size-4 text-slate-400 dark:text-slate-500 absolute top-1/2 end-3 -translate-y-1/2 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>',
    searchClasses: 'w-full bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition',
    searchWrapperClasses: 'bg-white dark:bg-slate-900 sticky top-0 mb-1.5 px-1.5 pt-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5',
    searchPlaceholder: 'Search...',
  };

  return (
    <div className={`w-full ${className}`}>
      <select
        ref={selectRef}
        data-select={JSON.stringify(dataSelectConfig)}
        value={value}
        onChange={() => {}} // React controlled input placeholder
        disabled={disabled}
        className="hidden"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchSelect;
