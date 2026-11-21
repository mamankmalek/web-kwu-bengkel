import React, { useEffect, useState } from 'react';
import { Sun, Moon, Package, Wrench, X } from 'lucide-react';
import type { ThemeMode } from '../types/lbmm';
import { getProductPhoto } from '../utils/format';

export const LBMM_LOGO_URL =
  'https://lh3.googleusercontent.com/d/1UyFmKqy67OOp0ozVS1aaJFmYRZ_ywwsT';
export const QRIS_IMAGE_URL = '/assets/aistudio/qris_baru_bengkel_ec1a11bc.jpeg';

export function LbmmLogoFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="lbmm-logo-light">
          <feColorMatrix
            type="matrix"
            values="
              1.00  -0.89  -0.89   0   0
              0.23  -0.12  -0.12   0   0
              0.19  -0.07  -0.07   0   0
              0      0      0      1   0"
          />
        </filter>
        <filter id="lbmm-logo-dark">
          <feColorMatrix
            type="matrix"
            values="
              0.05   0.00   0.00   0   0.95
             -0.95   0.48   0.48   0   0.95
             -0.95   0.48   0.48   0   0.96
              0      0      0      1   0"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function ThemeSwitch({
  theme,
  onToggle,
  compact = false,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="Mode gelap"
      onClick={onToggle}
      className="ios-switch-btn"
    >
      {!compact && <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span className="ios-switch-track" aria-hidden="true">
        <span className="ios-switch-thumb" />
      </span>
      {!compact && <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}

export function StatusChip({
  status,
  label,
}: {
  status: 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
}) {
  return <span className={`status-chip ${status}`}>{label}</span>;
}

export function ProductMedia({
  src,
  category,
  className = '',
}: {
  src?: string;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = getProductPhoto(src);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-white ${className}`}
    >
      {resolved && !failed ? (
        <img
          src={resolved}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-1.5"
        />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)]"
          aria-hidden="true"
        >
          {category === 'Jasa Servis' ? (
            <Wrench className="w-6 h-6" strokeWidth={1.75} />
          ) : (
            <Package className="w-6 h-6" strokeWidth={1.75} />
          )}
        </span>
      )}
    </span>
  );
}

export function IosModal({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-[560px]',
  children,
  hideHeader = false,
  id,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
  id?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/45 backdrop-blur-sm animate-[fadeIn_0.18s_ease]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`ios-enter w-full ${maxWidthClass} max-h-[92dvh] md:max-h-[88dvh] overflow-y-auto rounded-t-[28px] md:rounded-[26px] p-5 md:p-6 bg-[var(--surface-elevated)] backdrop-blur-2xl border border-[var(--glass-border)] shadow-[var(--shadow-md)] pb-[calc(20px+env(safe-area-inset-bottom))] md:pb-6`}
      >
        <div className="md:hidden w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-4" aria-hidden="true" />
        {!hideHeader && (
          <div className="flex items-center justify-between gap-3 mb-4 no-print">
            <h2 className="text-[1.1rem] font-bold tracking-tight m-0">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Tutup ${title}`}
              className="ios-icon-btn w-9 h-9 min-w-[36px] min-h-[36px] rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
