// FILE: src/components/Toast.tsx

import React, { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { cn } from '../lib/utils';

export function Toast() {
  const { toastMessage, clearToast } = useGameStore();
  
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(clearToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);
  
  if (!toastMessage) return null;
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={cn(
          'bg-card border border-border rounded-lg px-4 py-2 shadow-lg',
          'animate-in slide-in-from-top-2 duration-300',
          'max-w-sm text-center text-sm'
        )}
        role="alert"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </div>
  );
}