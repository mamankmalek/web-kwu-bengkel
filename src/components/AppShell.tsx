import React from 'react';
import {
  Home,
  Wrench,
  ClipboardList,
  Receipt,
  Package,
  BarChart2,
  UserCheck,
  Plus,
  Menu,
  LogOut,
  Upload,
} from 'lucide-react';
import type { PendingProof, RouteKey, ThemeMode } from '../types/lbmm';
import { IosModal, LBMM_LOGO_URL, ThemeSwitch } from './LiquidPrimitives';

export const NAV_ITEMS: { key: RouteKey; label: string; shortLabel: string }[] = [
  { key: 'home', label: 'Ringkasan', shortLabel: 'Ringkas' },
  { key: 'wo', label: 'WO Baru', shortLabel: 'WO Baru' },
  { key: 'daftar-wo', label: 'Daftar WO', shortLabel: 'WO' },
  { key: 'kasir', label: 'Kasir', shortLabel: 'Kasir' },
  { key: 'inventaris', label: 'Inventaris', shortLabel: 'Stok' },
  { key: 'laporan', label: 'Laporan', shortLabel: 'Laporan' },
  { key: 'absen', label: 'Absen KWU', shortLabel: 'Absen' },
];

export function NavIcon({ route, className = 'w-[18px] h-[18px]' }: { route: RouteKey; className?: string }) {
  switch (route) {
    case 'home':
      return <Home className={className} strokeWidth={1.9} />;
    case 'wo':
      return <Wrench className={className} strokeWidth={1.9} />;
    case 'daftar-wo':
      return <ClipboardList className={className} strokeWidth={1.9} />;
    case 'kasir':
      return <Receipt className={className} strokeWidth={1.9} />;
    case 'inventaris':
      return <Package className={className} strokeWidth={1.9} />;
    case 'laporan':
      return <BarChart2 className={className} strokeWidth={1.9} />;
    case 'absen':
      return <UserCheck className={className} strokeWidth={1.9} />;
  }
}

export function AppShell({
  route,
  pageTitle,
  homeDateLabel,
  theme,
  onToggleTheme,
  onLogout,
  menuOpen,
  onSetMenuOpen,
  pendingProof,
  onRetryProof,
  retryingProof,
  mobileCartSlot,
  children,
}: {
  route: RouteKey;
  pageTitle: string;
  homeDateLabel: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
  menuOpen: boolean;
  onSetMenuOpen: (open: boolean) => void;
  pendingProof: PendingProof | null;
  onRetryProof: () => void;
  retryingProof: boolean;
  mobileCartSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mobilePrimaryRoutes: RouteKey[] = ['home', 'daftar-wo', 'wo', 'inventaris'];

  return (
    <div id="app-shell" className="min-h-[100dvh] lg:grid lg:grid-cols-[266px_minmax(0,1fr)]">
      {/* Laptop / Desktop Floating Liquid Glass Sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-3.5 h-[calc(100dvh-28px)] m-3.5 mr-0 rounded-[26px] p-4 glass-chrome z-20">
        <a
          href="#/"
          className="flex items-center gap-3 px-2.5 pb-5 mb-2 border-b border-[var(--border)] text-inherit no-underline"
        >
          <img
            src={LBMM_LOGO_URL}
            alt="Logo LBMM"
            width={132}
            height={42}
            referrerPolicy="no-referrer"
            className="brand-logo w-[124px] h-[40px]"
          />
          <span className="text-[0.76rem] leading-tight font-semibold text-[var(--muted)]">
            Service
            <br />
            <span className="text-[var(--text)] font-bold">2026/2027</span>
          </span>
        </a>

        <nav id="desktop-nav" aria-label="Menu utama" className="grid gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.key === route;
            return (
              <a
                key={item.key}
                href={item.key === 'home' ? '#/' : `#/${item.key}`}
                data-route={item.key}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 min-h-[42px] px-3.5 rounded-[13px] text-[0.875rem] no-underline transition-all border ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--primary)] font-bold border-[var(--accent-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                    : 'text-[var(--muted)] font-medium border-transparent hover:bg-[var(--surface-recessed)] hover:text-[var(--text)]'
                }`}
              >
                <NavIcon route={item.key} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <p className="text-[0.72rem] text-[var(--muted)] px-2.5 mb-2.5">
            LBMM · FT-IRS ITS
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="ios-btn ios-btn-ghost w-full justify-start text-[var(--muted)] hover:text-[var(--danger)]"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="min-w-0 flex flex-col">
        {/* Sticky Frosted Glass Topbar */}
        <header className="sticky top-0 z-10 px-3.5 md:px-6 lg:px-7 pt-[max(8px,env(safe-area-inset-top))] pb-2">
          <div className="glass-chrome rounded-[20px] h-[52px] md:h-[58px] px-3.5 md:px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <a
                href="#/"
                aria-label="LBMM, buka ringkasan"
                className="lg:hidden shrink-0 flex items-center"
              >
                <img
                  src={LBMM_LOGO_URL}
                  alt="Logo LBMM"
                  width={96}
                  height={32}
                  referrerPolicy="no-referrer"
                  className="brand-logo w-[84px] sm:w-[96px] h-[30px]"
                />
              </a>
              <div className="min-w-0 flex flex-col justify-center">
                <span
                  id="page-title"
                  className="text-[0.92rem] md:text-[1rem] font-bold tracking-tight truncate"
                >
                  {pageTitle}
                </span>
                <p
                  id="home-date"
                  className="hidden sm:block text-[0.72rem] text-[var(--muted)] m-0 truncate"
                >
                  {homeDateLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="#/wo"
                className="ios-btn ios-btn-primary min-h-[38px] px-3 md:px-4 text-[0.82rem]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">WO Baru</span>
              </a>
              <ThemeSwitch theme={theme} onToggle={onToggleTheme} compact />
              <button
                type="button"
                id="menu-toggle"
                onClick={() => onSetMenuOpen(true)}
                aria-label="Buka menu"
                aria-haspopup="dialog"
                className="lg:hidden ios-icon-btn w-[38px] h-[38px] min-w-[38px] min-h-[38px]"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main"
          tabIndex={-1}
          className={`flex-1 w-full max-w-[1440px] mx-auto px-3.5 md:px-6 lg:px-7 pt-2 md:pt-4 focus:outline-none ${
            route === 'kasir'
              ? 'pb-28 md:pb-10'
              : 'pb-24 lg:pb-10'
          }`}
        >
          {pendingProof && (
            <div
              id="pending-proof"
              className="glass-panel p-4 mb-4 border-[var(--warning-bright)]/40 bg-[var(--warning-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <strong className="text-sm text-[var(--warning)]">
                  Foto belum tersimpan
                </strong>
                <p id="pending-proof-text" className="text-xs m-0 mt-0.5 text-[var(--text)]">
                  Transaksi {pendingProof.idTrans} tercatat. Kirim ulang foto.
                </p>
              </div>
              <button
                type="button"
                id="retry-proof-button"
                disabled={retryingProof}
                onClick={onRetryProof}
                className="ios-btn ios-btn-secondary min-h-[38px] text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{retryingProof ? 'Mengirim...' : 'Kirim ulang foto'}</span>
              </button>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Mobile / Tablet Bottom Floating iOS Tab Dock (Hidden on Desktop >= lg, swapped for Mobile Cart Bar on Kasir) */}
      {route === 'kasir' && mobileCartSlot ? (
        mobileCartSlot
      ) : (
        <nav
          aria-label="Navigasi cepat bawah"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pointer-events-none"
        >
          <div className="pointer-events-auto max-w-md mx-auto glass-chrome rounded-[22px] h-[56px] px-1.5 grid grid-cols-5 items-center">
            {mobilePrimaryRoutes.map((key) => {
              const item = NAV_ITEMS.find((n) => n.key === key)!;
              const active = route === key;
              return (
                <a
                  key={key}
                  href={key === 'home' ? '#/' : `#/${key}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 h-[44px] rounded-[16px] no-underline transition-colors ${
                    active
                      ? 'text-[var(--primary)] bg-[var(--accent-soft)] font-bold'
                      : 'text-[var(--muted)] font-medium hover:text-[var(--text)]'
                  }`}
                >
                  <NavIcon route={key} className="w-[18px] h-[18px]" />
                  <span className="text-[10px] leading-none">{item.shortLabel}</span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => onSetMenuOpen(true)}
              aria-label="Menu lainnya"
              className={`flex flex-col items-center justify-center gap-0.5 h-[44px] rounded-[16px] border-0 bg-transparent transition-colors ${
                ['kasir', 'laporan', 'absen'].includes(route)
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--muted)] font-medium'
              }`}
            >
              <Menu className="w-[18px] h-[18px]" />
              <span className="text-[10px] leading-none">Menu</span>
            </button>
          </div>
        </nav>
      )}

      {/* iPad & Mobile Slide-Up / Popover Menu Sheet */}
      <IosModal
        open={menuOpen}
        onClose={() => onSetMenuOpen(false)}
        title="Menu"
        maxWidthClass="max-w-[400px]"
        id="menu-dialog"
      >
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[var(--border)]">
          <img
            src={LBMM_LOGO_URL}
            alt="Logo LBMM"
            width={106}
            height={34}
            referrerPolicy="no-referrer"
            className="brand-logo w-[106px] h-[34px]"
          />
          <span className="text-xs font-semibold text-[var(--muted)]">
            Service 2026/2027 · FT-IRS ITS
          </span>
        </div>

        <nav id="mobile-nav" aria-label="Menu utama seluler" className="grid gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = item.key === route;
            return (
              <a
                key={item.key}
                href={item.key === 'home' ? '#/' : `#/${item.key}`}
                onClick={() => onSetMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 min-h-[46px] px-4 rounded-2xl text-[0.92rem] no-underline border transition-colors ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--primary)] font-bold border-[var(--accent-border)]'
                    : 'bg-[var(--surface-recessed)]/50 text-[var(--text)] font-medium border-transparent hover:bg-[var(--surface-recessed)]'
                }`}
              >
                <NavIcon route={item.key} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {
            onSetMenuOpen(false);
            onLogout();
          }}
          className="ios-btn ios-btn-secondary w-full mt-5 text-[var(--danger)]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </IosModal>
    </div>
  );
}
