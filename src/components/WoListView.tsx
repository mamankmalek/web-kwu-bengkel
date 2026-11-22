import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import type {
  LastTransactionData,
  WorkOrder,
  WorkOrderDetailResponse,
  WoFilterStatus,
} from '../types/lbmm';
import { filterWorkOrders } from '../utils/business';
import { addDays, formatCount, labelTgl, rp, safeExternalHttpsUrl, validDay } from '../utils/format';
import { StatusChip } from './LiquidPrimitives';

function customerInitials(name: string): string {
  return (
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'WO'
  );
}

export function WoListView({
  date,
  today,
  rows,
  loading,
  detail,
  detailLoading,
  onChangeDate,
  onRefreshList,
  onOpenDetail,
  onBackToList,
  onOpenCashierWithWO,
  onViewReceipt,
}: {
  date: string;
  today: string;
  rows: WorkOrder[];
  loading: boolean;
  detail: WorkOrderDetailResponse | null;
  detailLoading: boolean;
  onChangeDate: (nextDate: string) => void;
  onRefreshList: () => void;
  onOpenDetail: (idWO: string, tgl: string) => void;
  onBackToList: () => void;
  onOpenCashierWithWO: (wo: WorkOrder) => void;
  onViewReceipt: (trxData: LastTransactionData) => void;
}) {
  const [filter, setFilter] = useState<WoFilterStatus>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const done = rows.filter((r) => r.status === 'Selesai').length;
    return {
      all: rows.length,
      pending: rows.length - done,
      done,
    };
  }, [rows]);

  const filteredRows = useMemo(
    () => filterWorkOrders(rows, filter, query),
    [rows, filter, query]
  );

  // Detail View
  if (detail || detailLoading) {
    const wo = detail?.wo;
    const trx = detail?.transaksi;
    const items = detail?.items || [];
    const safeProofUrl = safeExternalHttpsUrl(trx?.proofUrl);
    const done = Boolean(trx || wo?.status === 'Selesai');

    return (
      <div id="view-wo-detail" className="ios-enter max-w-[920px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="ios-btn ios-btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Daftar WO</span>
            </button>
            <div>
              <h1 className="text-[1.25rem] md:text-[1.5rem] font-extrabold tracking-tight m-0">
                {wo ? `WO ${wo.idWO}` : 'Detail WO'}
              </h1>
              {wo?.tgl && (
                <p className="text-xs text-[var(--muted)] m-0">{labelTgl(wo.tgl) || wo.tgl}</p>
              )}
            </div>
          </div>

          {wo && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenDetail(wo.idWO, wo.tgl)}
                className="ios-btn ios-btn-secondary"
              >
                <RefreshCw className={`w-4 h-4 ${detailLoading ? 'animate-spin' : ''}`} />
                <span>Muat ulang</span>
              </button>
              {trx ? (
                <button
                  type="button"
                  onClick={() =>
                    onViewReceipt({
                      items,
                      total: Number(trx.total || 0),
                      wo,
                      metode: trx.metode || 'Tunai',
                      idTrans: trx.idTrans || wo.idWO,
                      proofUrl: trx.proofUrl || '',
                      tanggal: trx.waktu || wo.tgl,
                    })
                  }
                  className="ios-btn ios-btn-primary"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Lihat nota</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenCashierWithWO(wo)}
                  className="ios-btn ios-btn-primary"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Buka kasir</span>
                </button>
              )}
            </div>
          )}
        </div>

        {detailLoading && !wo ? (
          <div className="glass-panel p-8 text-center text-sm text-[var(--muted)]">
            Memuat...
          </div>
        ) : wo ? (
          <>
            <section className="glass-panel p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Status</span>
                  <StatusChip
                    status={done ? 'success' : 'warning'}
                    label={done ? 'Selesai' : 'Proses'}
                  />
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Pelanggan</span>
                  <strong className="text-right">{wo.nama}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--muted)]">Nomor Polisi</span>
                  <span className="font-mono-code font-bold">{wo.nopol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Motor & Penerima</span>
                  <span className="text-right font-medium">
                    {wo.motor} · {wo.penerima}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-recessed)]/70 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--muted)] mb-1">
                    Keluhan
                  </div>
                  <p className="text-sm m-0 whitespace-pre-wrap">{wo.keluhan || '—'}</p>
                </div>
                {trx && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      Dibayar via <strong>{trx.metode}</strong> ({trx.idTrans})
                    </span>
                    <span className="font-bold text-base tabular-nums text-[var(--primary)]">
                      {rp(trx.total)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {safeProofUrl && (
              <div className="glass-panel p-4 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Bukti Pembayaran</span>
                <a
                  href={safeProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ios-btn ios-btn-secondary text-xs"
                >
                  Lihat foto bukti
                </a>
              </div>
            )}

            {items.length > 0 && (
              <section className="glass-panel p-5">
                <h2 className="text-sm font-bold m-0 mb-3">Item Servis & Part</h2>
                <div className="glass-table-wrap">
                  <table className="glass-table responsive-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Harga</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`}>
                          <td data-label="Item" className="font-semibold">
                            {item.nama}
                          </td>
                          <td data-label="Qty" className="text-right tabular-nums">
                            {formatCount(item.qty)}
                          </td>
                          <td data-label="Harga" className="text-right tabular-nums">
                            {rp(item.harga)}
                          </td>
                          <td data-label="Subtotal" className="text-right font-bold tabular-nums">
                            {rp(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    );
  }

  const segIndex = filter === 'all' ? 0 : filter === 'pending' ? 1 : 2;

  return (
    <div id="view-daftar-wo" className="ios-enter space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
            Daftar WO
          </h1>
          <p className="text-xs md:text-sm text-[var(--muted)] m-0 mt-0.5">
            {labelTgl(date) || date}
          </p>
        </div>
        <a href="#/wo" className="ios-btn ios-btn-primary">
          <Plus className="w-4 h-4" />
          <span>WO Baru</span>
        </a>
      </div>

      {/* Controls Toolbar */}
      <section className="glass-panel p-3.5 md:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Date switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onChangeDate(addDays(date, -1))}
              aria-label="Tanggal sebelumnya"
              className="ios-icon-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                aria-label="Tanggal WO"
                value={date}
                onChange={(e) => validDay(e.target.value) && onChangeDate(e.target.value)}
                className="ios-input ios-input-icon pr-3 min-h-[42px] w-[168px]"
              />
            </div>
            <button
              type="button"
              onClick={() => onChangeDate(addDays(date, 1))}
              aria-label="Tanggal berikutnya"
              className="ios-icon-btn"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(today)}
              className="ios-btn ios-btn-secondary min-h-[42px] text-xs px-3"
            >
              Hari ini
            </button>
          </div>

          <button
            type="button"
            onClick={onRefreshList}
            disabled={loading}
            className="ios-btn ios-btn-secondary min-h-[42px] text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Memuat...' : 'Muat ulang'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-3 items-center">
          {/* iOS Segmented Filter */}
          <div className="ios-segmented grid-cols-3" role="group" aria-label="Filter status WO">
            <span
              className="ios-segmented-thumb"
              style={{
                width: 'calc((100% - 8px) / 3)',
                transform: `translateX(${segIndex * 100}%)`,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              Semua ({formatCount(counts.all)})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'pending'}
              onClick={() => setFilter('pending')}
            >
              Proses ({formatCount(counts.pending)})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'done'}
              onClick={() => setFilter('done')}
            >
              Selesai ({formatCount(counts.done)})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Cari nama, nopol, motor, ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ios-input ios-input-icon"
            />
          </div>
        </div>
      </section>

      {/* Grid of WO Cards */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card p-5 animate-pulse space-y-3">
              <div className="h-4 w-1/3 bg-[var(--surface-recessed)] rounded" />
              <div className="h-3 w-2/3 bg-[var(--surface-recessed)] rounded" />
              <div className="h-8 w-full bg-[var(--surface-recessed)] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredRows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRows.map((wo) => {
            const done = wo.status === 'Selesai';
            return (
              <article
                key={wo.idWO}
                className="glass-card glass-card-interactive p-4 md:p-5 flex flex-col justify-between gap-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] text-[var(--primary)] font-extrabold text-sm flex items-center justify-center shrink-0">
                      {customerInitials(wo.nama)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[0.98rem] font-bold m-0 truncate">{wo.nama}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-[var(--muted)]">
                        <span className="font-mono-code font-bold text-[var(--text)]">
                          {wo.idWO}
                        </span>
                        {wo.jam && <span>· {wo.jam}</span>}
                        <span>· {wo.penerima}</span>
                      </div>
                    </div>
                  </div>
                  <StatusChip
                    status={done ? 'success' : 'warning'}
                    label={done ? 'Selesai' : 'Proses'}
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[var(--surface-recessed)]/70 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text)]">{wo.motor}</span>
                    <span className="font-mono-code font-bold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--glass-border-subtle)]">
                      {wo.nopol}
                    </span>
                  </div>
                  {wo.keluhan && (
                    <p className="text-[var(--muted)] m-0 line-clamp-2">{wo.keluhan}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm font-extrabold tabular-nums">
                    {wo.total != null ? rp(wo.total) : done ? 'Lunas' : 'Belum dibayar'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(wo.idWO, wo.tgl || date)}
                      className="ios-btn ios-btn-secondary min-h-[38px] text-xs px-3"
                    >
                      Detail
                    </button>
                    {!done && (
                      <button
                        type="button"
                        onClick={() => onOpenCashierWithWO(wo)}
                        className="ios-btn ios-btn-primary min-h-[38px] text-xs px-3.5"
                      >
                        Buka kasir
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-10 text-center text-sm text-[var(--muted)] flex flex-col items-center">
          <ClipboardList className="w-9 h-9 mb-2.5 opacity-45" />
          <p className="m-0 font-medium">Belum ada WO.</p>
        </div>
      )}
    </div>
  );
}
