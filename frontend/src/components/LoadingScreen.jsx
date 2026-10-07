import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

export const LoadingScreen = ({ message = 'Preparing your session...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
    <div className="flex flex-col items-center gap-5 text-center max-w-sm px-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 bg-primary-500/20 rounded-2xl blur-xl animate-pulse" />
        <div className="p-4 bg-primary-600 rounded-2xl text-white shadow-lg shadow-primary-600/30 relative z-10 animate-pulse">
          <UtensilsCrossed size={28} />
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          LunchOrder
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  </div>
);

export default LoadingScreen;
