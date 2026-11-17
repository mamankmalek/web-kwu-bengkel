import React, { useMemo } from 'react';
import {
  Wrench,
  Package,
  BarChart2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Receipt,
  ClipboardList,
} from 'lucide-react';
import type { ProductRow, ReportData, WorkOrder } from '../types/lbmm';
import { computeInventoryAnalytics } from '../utils/business';
import { dateLabel, formatCount, rp } from '../utils/format';
import { StatusChip } from './LiquidPrimitives';

export function HomeView({
  report,
  products,
  todayWOList,
  loading,
  onRefresh,
  onSelectWOForDetail,
}: {
  report: ReportData | null;
  products: ProductRow[];
  todayWOList: WorkOrder[];
  loading: boolean;
  onRefresh: () => void;
  onSelectWOForDetail: (wo: WorkOrder) => void;
}) {
  const analytics = useMemo(() => computeInventoryAnalytics(products), [products]);

  const s = report?.summary;
  const transactions = report?.transactions || [];
  const lowItems = report?.stock?.low || [];
  const lowTotal = report?.stock?.lowTotal ?? lowItems.length;
  const woDoneToday = todayWOList.filter((w) => w.status === 'Selesai').length;
  const unknownCosts = s?.unknownCostTransactions || 0;

  return (
    <div id="view-home" className="ios-enter space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
            Ringkasan
          </h1>
          <p className="text-xs md:text-sm text-[var(--muted)] m-0 mt-0.5">
            Operasional bengkel, transaksi harian, dan kondisi stok suku cadang
          </p>
        </div>
        <button
          type="button"
          id="home-refresh"
          onClick={onRefresh}
          disabled={loading}
          className="ios-btn ios-btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Memuat...' : 'Muat ulang'}</span>
        </button>
      </div>

      {/* 4 KPI Glass Cards */}
      <section aria-label="Ringkasan hari ini" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <article className="glass-panel p-4 md:p-5">
          <div className="text-xs font-semibold text-[var(--muted)]">Omzet hari ini</div>
          <div className="text-[1.45rem] md:text-[1.6rem] font-extrabold tracking-tight tabular-nums mt-1.5">
            {s ? rp(s.revenue) : '—'}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 tabular-nums">
            {s
              ? `${formatCount(s.transactions)} transaksi · ${formatCount(s.itemsSold)} item`
              : 'Memuat ringkasan...'}
          </div>
        </article>

        <article className="glass-panel p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]">Laba kotor hari ini</span>
            {unknownCosts > 0 && <StatusChip status="warning" label="Parsial" />}
          </div>
          <div className="text-[1.45rem] md:text-[1.6rem] font-extrabold tracking-tight tabular-nums mt-1.5 text-[var(--success)]">
            {s ? rp(s.grossProfit) : '—'}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 tabular-nums">
            {s ? `Modal terjual ${rp(s.costOfGoods)}` : 'Menunggu data'}
          </div>
        </article>

        <article className="glass-panel p-4 md:p-5">
          <div className="text-xs font-semibold text-[var(--muted)]">Transaksi hari ini</div>
          <div className="text-[1.45rem] md:text-[1.6rem] font-extrabold tracking-tight tabular-nums mt-1.5">
            {s ? formatCount(s.transactions) : '—'}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 tabular-nums">
            {s ? `Rata-rata ${rp(s.avgTransaction)}` : '—'}
          </div>
        </article>

        <article className="glass-panel p-4 md:p-5">
          <div className="text-xs font-semibold text-[var(--muted)]">Pembelian hari ini</div>
          <div className="text-[1.45rem] md:text-[1.6rem] font-extrabold tracking-tight tabular-nums mt-1.5">
            {s ? rp(s.purchases) : '—'}
          </div>
          <div className="text-xs text-[var(--muted)] mt-1.5 tabular-nums">
            {s ? `${formatCount(s.purchaseCount)} restok · Biaya ${rp(s.operatingExpenses)}` : '—'}
          </div>
        </article>
      </section>

      {/* Main Split Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Transaksi Hari Ini */}
        <article className="glass-panel p-4 md:p-5 lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="text-[1rem] font-bold m-0">Transaksi hari ini</h2>
            </div>
            <a
              href="#/laporan"
              className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1 no-underline"
            >
              <span>Laporan lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {transactions.length > 0 ? (
            <div className="glass-table-wrap flex-1">
              <table className="glass-table responsive-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Metode</th>
                    <th className="text-right">Total</th>
                    <th>WO</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((trx, idx) => (
                    <tr key={trx.id || `${trx.woId}-${idx}`}>
                      <td data-label="Waktu" className="tabular-nums text-xs text-[var(--muted)]">
                        {trx.time || dateLabel(trx.date, true)}
                      </td>
                      <td data-label="Pelanggan" className="font-semibold">
                        {trx.customer || 'Pelanggan'}
                      </td>
                      <td data-label="Metode">
                        <StatusChip
                          status={trx.method === 'QRIS' ? 'neutral' : 'success'}
                          label={trx.method || 'Tunai'}
                        />
                      </td>
                      <td data-label="Total" className="text-right font-bold tabular-nums">
                        {rp(trx.total)}
                      </td>
                      <td data-label="WO">
                        {trx.woId ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectWOForDetail({
                                idWO: trx.woId!,
                                tgl: trx.woDate || trx.date || report?.today || '',
                                nama: trx.customer || '-',
                                nopol: '-',
                                motor: '-',
                                keluhan: '-',
                                penerima: '-',
                              })
                            }
                            className="font-mono-code text-xs font-bold text-[var(--primary)] hover:underline bg-transparent border-0 p-0"
                          >
                            {trx.woId}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-sm text-[var(--muted)] rounded-2xl bg-[var(--surface-recessed)]/60">
              <Receipt className="w-8 h-8 mb-2 opacity-50" />
              <p className="m-0 font-medium">
                {loading ? 'Memuat transaksi...' : 'Belum ada transaksi hari ini.'}
              </p>
            </div>
          )}
        </article>

        {/* Right Stack: Work Order + Stok Menipis */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Work Order Summary */}
          <article className="glass-panel p-4 md:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[1rem] font-bold m-0">Work order</h2>
              </div>
              <a
                href="#/daftar-wo"
                className="text-xs font-semibold text-[var(--primary)] hover:underline no-underline"
              >
                Lihat semua
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-[var(--surface-recessed)] text-center">
                <div className="text-xs text-[var(--muted)]">Aktif</div>
                <div className="text-lg font-extrabold tabular-nums mt-0.5 text-[var(--warning)]">
                  {formatCount(report?.workOrders?.pendingAll ?? todayWOList.filter((w) => w.status !== 'Selesai').length)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface-recessed)] text-center">
                <div className="text-xs text-[var(--muted)]">Selesai hari ini</div>
                <div className="text-lg font-extrabold tabular-nums mt-0.5 text-[var(--success)]">
                  {formatCount(woDoneToday)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface-recessed)] text-center">
                <div className="text-xs text-[var(--muted)]">WO hari ini</div>
                <div className="text-lg font-extrabold tabular-nums mt-0.5">
                  {formatCount(todayWOList.length)}
                </div>
              </div>
            </div>
          </article>

          {/* Stok Menipis + Mini Health Bar */}
          <article className="glass-panel p-4 md:p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--warning-bright)]" />
                <h2 className="text-[1rem] font-bold m-0">Stok menipis</h2>
              </div>
              <span className="status-chip warning tabular-nums">{formatCount(lowTotal)} item</span>
            </div>

            {products.length > 0 && (
              <div className="mb-3">
                <div className="h-2 rounded-full overflow-hidden flex bg-[var(--surface-recessed)]">
                  {analytics.safeCount > 0 && (
                    <div
                      style={{
                        width: `${(analytics.safeCount / Math.max(1, analytics.totalSku)) * 100}%`,
                        background: 'var(--chart-profit)',
                      }}
                      title={`Stok aman: ${analytics.safeCount}`}
                    />
                  )}
                  {analytics.lowCount > 0 && (
                    <div
                      style={{
                        width: `${(analytics.lowCount / Math.max(1, analytics.totalSku)) * 100}%`,
                        background: 'var(--warning-bright)',
                      }}
                      title={`Menipis: ${analytics.lowCount}`}
                    />
                  )}
                  {analytics.emptyCount > 0 && (
                    <div
                      style={{
                        width: `${(analytics.emptyCount / Math.max(1, analytics.totalSku)) * 100}%`,
                        background: 'var(--primary)',
                      }}
                      title={`Habis: ${analytics.emptyCount}`}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[0.7rem] text-[var(--muted)] mt-1.5 tabular-nums">
                  <span>Aman: {analytics.safeCount}</span>
                  <span>Menipis: {analytics.lowCount}</span>
                  <span>Habis: {analytics.emptyCount}</span>
                </div>
              </div>
            )}

            {lowItems.length > 0 ? (
              <div className="space-y-2 flex-1">
                {lowItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--surface-recessed)]/70 text-xs"
                  >
                    <span className="font-semibold truncate">{item.name}</span>
                    <StatusChip
                      status={item.stock <= 0 ? 'danger' : 'warning'}
                      label={item.stock <= 0 ? 'Habis' : `Sisa ${formatCount(item.stock)}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-6 text-xs text-[var(--muted)] rounded-2xl bg-[var(--surface-recessed)]/60">
                Semua stok aman.
              </div>
            )}

            <a
              href="#/inventaris"
              className="ios-btn ios-btn-secondary w-full mt-3 text-xs"
            >
              <span>Kelola & lihat grafik inventaris</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </article>
        </div>
      </section>

      {/* 3 Quick Action Cards */}
      <section aria-label="Akses cepat" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <a
          href="#/wo"
          className="glass-card glass-card-interactive p-4 flex items-center gap-3.5 no-underline text-inherit"
        >
          <span className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-sm">WO Baru</div>
            <div className="text-xs text-[var(--muted)] truncate">
              Buat antrean servis motor pelanggan
            </div>
          </div>
        </a>

        <a
          href="#/inventaris"
          className="glass-card glass-card-interactive p-4 flex items-center gap-3.5 no-underline text-inherit"
        >
          <span className="w-11 h-11 rounded-2xl bg-[var(--info-soft)] text-[var(--info)] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-sm">Inventaris</div>
            <div className="text-xs text-[var(--muted)] truncate">
              Pantau stok, frekuensi pakai & restok
            </div>
          </div>
        </a>

        <a
          href="#/laporan"
          className="glass-card glass-card-interactive p-4 flex items-center gap-3.5 no-underline text-inherit"
        >
          <span className="w-11 h-11 rounded-2xl bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-sm">Laporan</div>
            <div className="text-xs text-[var(--muted)] truncate">
              Omzet, laba kotor, biaya & unduh CSV
            </div>
          </div>
        </a>
      </section>
    </div>
  );
}
