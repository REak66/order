import React from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { cn } from '../utils/cx';

const VARIANT_CONFIGS = {
  danger: {
    icon: AlertCircle,
    iconWrapper: 'bg-red-50 dark:bg-red-950/40 text-red-500 border border-red-200/80 dark:border-red-800/60',
    button: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    iconWrapper: 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/80 dark:border-amber-800/60',
    button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20',
  },
  primary: {
    icon: Info,
    iconWrapper: 'bg-primary-50 dark:bg-primary-950/40 text-primary-500 border border-primary-200/80 dark:border-primary-800/60',
    button: 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20',
  },
};

export const ConfirmModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'danger' | 'warning' | 'primary'
  loading = false,
  children,
}) => {
  const cfg = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.warning;
  const Icon = cfg.icon;

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      maxWidth="max-w-md"
      showClose={!loading}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs", cfg.iconWrapper)}>
          <Icon size={28} />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          )}
        </div>

        {children && (
          <div className="w-full text-left pt-2">
            {children}
          </div>
        )}

        <div className="flex items-center gap-3 w-full pt-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95",
              cfg.button
            )}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
