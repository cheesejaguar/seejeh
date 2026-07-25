// FILE: src/components/Toasts.tsx

import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../hooks/useTranslation';

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const { t } = useTranslation();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast${toast.tone === 'error' ? ' is-error' : ''}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {t(toast.key, toast.params)}
        </div>
      ))}
    </div>
  );
}
