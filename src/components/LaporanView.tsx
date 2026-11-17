import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import type {
  DailyReportRow,
  ProductRow,
  ReportData,
  ReportPreset,
  WorkOrder,
} from '../types/lbmm';
import {
  axisMoney,
  buildReportCSV,
  dateLabel,
  formatCount,
  rp,
  safeExternalHttpsUrl,
} from '../utils/format';
import { triggerFileDownload } from '../utils/receiptExport';
import { StatusChip } from './LiquidPrimitives';

const PRESETS: { key: ReportPreset; label: string }[] = [
  { key: 'month', label: 'Bulan ini' },
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: '7 hari terakhir' },
  { key: 'last-month', label: 'Bulan lalu' },
  { key: 'custom', label: 'Pilih tanggal' },
];

export function LaporanView({
  report,
  products,
  loading,
  preset,
  customStart,
  customEnd,
  onSelectPreset,
  onChangeCustomRange,
  onRefresh,
  onOpenExpense,
  onOpenWODetail,
}: {
  report: ReportData | null;
  products: ProductRow[];
  loading: boolean;
  preset: ReportPreset;
  customStart: string;
  customEnd: string;
  onSelectPreset: (preset: ReportPreset) => void;
  onChangeCustomRange: (start: string, end: string) => void;
  onRefresh: () => void;
  onOpenExpense: () => void;
  onOpenWODetail: (wo: WorkOrder) => void;
}) {
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  const s = report?.summary;
  const daily = report?.daily || [];

  const unknownDates = useMemo(() => {
    const set = new Set<string>();
    if (!report) return set;
    report.transactions.forEach((t) => {
      if (t.costIncomplete) set.add(t.date);
    });
    if ((report.summary.unknownCostTransactions || 0) > 0 && set.size === 0) {
      report.daily.forEach((d) => set.add(d.date));
    }
    return set;
  }, [report]);

  const handleDownloadCSV = () => {
    if (!report) return;
    const csv = buildReportCSV(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload([
      {
        blob,
        name: `Laporan_LBMM_${report.range.start}_${report.range.end}.csv`,
      },
    ]);
  };

  // Interactive SVG chart geometry
  const chartData = useMemo(() => {
    if (!daily.length) return null;
    const width = 680;
    const height = 220;
    const isGroupedBars = daily.length <= 3;
    const padL = 60;
    const padR = 20;
    const padT = 18;
    const padB = 34;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxVal = Math.max(
      10000,
      ...daily.map((d) => Math.max(d.revenue, d.grossProfit))
    );
    const barInset = isGroupedBars ? 44 : 0;
    const usableW = Math.max(1, innerW - barInset * 2);
    const stepX = daily.length > 1 ? usableW / (daily.length - 1) : usableW / 2;

    const points = daily.map((d, i) => {
      const x = daily.length === 1 ? padL + innerW / 2 : padL + barInset + i * stepX;
      const yRev = padT + innerH - (Math.max(0, d.revenue) / maxVal) * innerH;
      const yProf = padT + innerH - (Math.max(0, d.grossProfit) / maxVal) * innerH;
      return {
        ...d,
        x,
        yRev,
        yProf,
        incomplete: unknownDates.has(d.date),
      };
    });

    // Multi-segment polylines for profit (skipping incomplete cost dates)
    const profitSegments: string[] = [];
    let currentSegment: string[] = [];
    points.forEach((pt) => {
      if (pt.incomplete) {
        if (currentSegment.length > 0) {
          profitSegments.push(currentSegment.join(' '));
          currentSegment = [];
        }
      } else {
        currentSegment.push(`${pt.x},${pt.yProf}`);
      }
    });
    if (currentSegment.length > 0) profitSegments.push(currentSegment.join(' '));

    const revLine = points.map((pt) => `${pt.x},${pt.yRev}`).join(' ');
    const revArea =
      points.length > 0
        ? `${points[0].x},${padT + innerH} ${revLine} ${points[points.length - 1].x},${padT + innerH}`
        : '';

    return {
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      innerW,
      innerH,
      maxVal,
      points,
      revLine,
      revArea,
      profitSegments,
    };
  }, [daily, unknownDates]);

  const hoveredDay: DailyReportRow | null =
    hoveredDayIndex !== null && daily[hoveredDayIndex] ? daily[hoveredDayIndex] : null;

  const payTotal = Math.max(1, (s?.cash || 0) + (s?.qris || 0));
  const cashPct = Math.round(((s?.cash || 0) / payTotal) * 100);
  const qrisPct = 100 - cashPct;

  const topProducts = report?.topProducts || [];
  const maxTopQty = Math.max(1, ...topProducts.map((t) => Number(t.qty) || 0));

  return (
    <div id="view-laporan" className="ios-enter space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
            Laporan
          </h1>
          <p className="text-xs md:text-sm text-[var(--muted)] m-0 mt-0.5">
            {report ? `${dateLabel(report.range.start)} – ${dateLabel(report.range.end)}` : 'Memuat laporan...'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenExpense}
            className="ios-btn ios-btn-secondary"
          >
            <Plus className="w-4 h-4" />
            <span>Catat pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!report}
            className="ios-btn ios-btn-primary"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* Period Preset Toolbar */}
      <section className="glass-panel p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => {
            const active = preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onSelectPreset(p.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-[var(--primary)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--surface-recessed)] text-[var(--muted)] border-transparent hover:text-[var(--text)]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {preset === 'custom' && (
            <>
              <input
                type="date"
                aria-label="Dari tanggal"
                value={customStart}
                onChange={(e) => onChangeCustomRange(e.target.value, customEnd)}
                className="ios-input min-h-[40px] w-[148px]"
              />
              <span className="text-xs text-[var(--muted)]">s/d</span>
              <input
                type="date"
                aria-label="Sampai tanggal"
                value={customEnd}
                onChange={(e) => onChangeCustomRange(customStart, e.target.value)}
                className="ios-input min-h-[40px] w-[148px]"
              />
            </>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="ios-btn ios-btn-secondary min-h-[40px] text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Memuat...' : 'Muat ulang'}</span>
          </button>
        </div>
      </section>

      {/* 8 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Omzet</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">{s ? rp(s.revenue) : '—'}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {s?.revenueChange != null
              ? `${s.revenueChange >= 0 ? '+' : ''}${s.revenueChange}% vs periode lalu`
              : 'Pendapatan servis & part'}
          </div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Laba kotor</div>
          <div className="text-xl font-extrabold tabular-nums mt-1 text-[var(--success)]">
            {s ? rp(s.grossProfit) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {s ? `HPP ${rp(s.costOfGoods)}` : '—'}
          </div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Pembelian stok</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">{s ? rp(s.purchases) : '—'}</div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {s ? `${formatCount(s.purchaseCount)} restok` : '—'}
          </div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Biaya operasional</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">
            {s ? rp(s.operatingExpenses) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {report ? `${formatCount(report.expenses.length)} catatan` : '—'}
          </div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Estimasi laba bersih</div>
          <div className="text-xl font-extrabold tabular-nums mt-1 text-[var(--primary)]">
            {s ? rp(s.netProfit) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Laba kotor – biaya ops</div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Transaksi</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">
            {s ? formatCount(s.transactions) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {s ? `${formatCount(s.itemsSold)} item terjual` : '—'}
          </div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Rata-rata transaksi</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">
            {s ? rp(s.avgTransaction) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Nilai per nota</div>
        </article>
        <article className="glass-panel p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Stok menipis</div>
          <div className="text-xl font-extrabold tabular-nums mt-1 text-[var(--warning)]">
            {report ? formatCount(report.stock.lowTotal ?? report.stock.low.length) : '—'}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 tabular-nums">
            {report ? `Nilai modal ${rp(report.stock.value)}` : '—'}
          </div>
        </article>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Omzet & Laba Kotor Chart */}
        <article className="glass-panel p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="text-[1rem] font-bold m-0">Omzet dan laba kotor</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-revenue)]" />
                Omzet
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-profit)]" />
                Laba kotor
              </span>
            </div>
          </div>

          {hoveredDay && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-[var(--surface-recessed)] text-xs flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <strong>{dateLabel(hoveredDay.date)}</strong>
              <span>
                Omzet {rp(hoveredDay.revenue)} · Laba {rp(hoveredDay.grossProfit)} ·{' '}
                {formatCount(hoveredDay.transactions)} trx
              </span>
            </div>
          )}

          {chartData ? (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                className="w-full h-auto min-w-[420px]"
                role="img"
                aria-label="Grafik omzet dan laba kotor"
              >
                <defs>
                  <linearGradient id="rev-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-revenue)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--chart-revenue)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = chartData.padT + chartData.innerH * (1 - t);
                  return (
                    <g key={t}>
                      <line
                        x1={chartData.padL}
                        y1={y}
                        x2={chartData.width - chartData.padR}
                        y2={y}
                        stroke="var(--chart-grid)"
                        strokeWidth="1"
                      />
                      <text
                        x={chartData.padL - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="var(--muted)"
                      >
                        {axisMoney(chartData.maxVal * t)}
                      </text>
                    </g>
                  );
                })}

                {chartData.points.length <= 3 ? (
                  chartData.points.map((pt, i) => {
                    const barW = 24;
                    const revH =
                      chartData.padT + chartData.innerH - pt.yRev;
                    const profH =
                      chartData.padT + chartData.innerH - pt.yProf;
                    return (
                      <g
                        key={pt.date}
                        onMouseEnter={() => setHoveredDayIndex(i)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={pt.x - barW - 3}
                          y={pt.yRev}
                          width={barW}
                          height={Math.max(2, revH)}
                          rx="6"
                          fill="var(--chart-revenue)"
                        />
                        {!pt.incomplete && (
                          <rect
                            x={pt.x + 3}
                            y={pt.yProf}
                            width={barW}
                            height={Math.max(2, profH)}
                            rx="6"
                            fill="var(--chart-profit)"
                          />
                        )}
                      </g>
                    );
                  })
                ) : (
                  <>
                    <polygon points={chartData.revArea} fill="url(#rev-area-grad)" />
                    <polyline
                      fill="none"
                      stroke="var(--chart-revenue)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartData.revLine}
                    />
                    {chartData.profitSegments.map((seg, idx) => (
                      <polyline
                        key={idx}
                        fill="none"
                        stroke="var(--chart-profit)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={seg}
                      />
                    ))}
                    {chartData.points.map((pt, i) => (
                      <g
                        key={pt.date}
                        onMouseEnter={() => setHoveredDayIndex(i)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.yRev}
                          r={hoveredDayIndex === i ? 5.5 : 3.5}
                          fill="var(--chart-revenue)"
                        />
                        {!pt.incomplete && (
                          <circle
                            cx={pt.x}
                            cy={pt.yProf}
                            r={hoveredDayIndex === i ? 5.5 : 3.5}
                            fill="var(--chart-profit)"
                          />
                        )}
                      </g>
                    ))}
                  </>
                )}

                {chartData.points.map((pt, i) => {
                  const step = Math.max(1, Math.ceil(chartData.points.length / 7));
                  if (i % step !== 0 && i !== chartData.points.length - 1) return null;
                  return (
                    <text
                      key={`lbl-${pt.date}`}
                      x={pt.x}
                      y={chartData.height - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--muted)"
                    >
                      {dateLabel(pt.date, true)}
                    </text>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[var(--muted)] rounded-2xl bg-[var(--surface-recessed)]/60">
              Belum ada data harian pada periode ini.
            </div>
          )}
        </article>

        {/* Metode Pembayaran + Frekuensi Item */}
        <div className="lg:col-span-4 space-y-4">
          <article className="glass-panel p-5">
            <h2 className="text-[1rem] font-bold m-0 mb-3">Metode pembayaran</h2>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Tunai</span>
                  <span className="tabular-nums font-bold">
                    {s ? rp(s.cash) : '—'} ({cashPct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-recessed)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--chart-profit)] transition-all"
                    style={{ width: `${cashPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">QRIS</span>
                  <span className="tabular-nums font-bold">
                    {s ? rp(s.qris) : '—'} ({qrisPct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-recessed)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--chart-info)] transition-all"
                    style={{ width: `${qrisPct}%` }}
                  />
                </div>
              </div>
            </div>
          </article>

          <article className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="text-[1rem] font-bold m-0">Item paling sering dipakai</h2>
            </div>
            {topProducts.length > 0 ? (
              <div className="space-y-2.5">
                {topProducts.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-xs">
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-semibold truncate">{item.name}</span>
                      <span className="tabular-nums font-bold text-[var(--primary)] shrink-0">
                        {formatCount(item.qty)}×
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-recessed)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{
                          width: `${Math.max(10, (Number(item.qty) / maxTopQty) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] m-0">Belum ada penjualan item.</p>
            )}
          </article>
        </div>
      </section>

      {/* Penjualan Produk & Jasa Table */}
      <section className="glass-panel p-5">
        <h2 className="text-[1rem] font-bold m-0 mb-3">Penjualan produk & jasa</h2>
        {topProducts.length > 0 ? (
          <div className="glass-table-wrap">
            <table className="glass-table responsive-table">
              <thead>
                <tr>
                  <th>Produk / Jasa</th>
                  <th>Kategori</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Omzet</th>
                  <th className="text-right">Laba Kotor</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Produk" className="font-semibold">
                      {row.name}
                    </td>
                    <td data-label="Kategori">{row.category || '-'}</td>
                    <td data-label="Qty" className="text-right tabular-nums">
                      {formatCount(row.qty)}
                    </td>
                    <td data-label="Omzet" className="text-right tabular-nums font-bold">
                      {rp(row.revenue)}
                    </td>
                    <td data-label="Laba kotor" className="text-right tabular-nums text-[var(--success)] font-bold">
                      {rp(row.grossProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] m-0">Belum ada data penjualan produk.</p>
        )}
      </section>

      {/* Rincian Transaksi */}
      <section className="glass-panel p-5">
        <h2 className="text-[1rem] font-bold m-0 mb-3">Rincian transaksi</h2>
        {report && report.transactions.length > 0 ? (
          <div className="glass-table-wrap">
            <table className="glass-table responsive-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>WO</th>
                  <th>Metode</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {report.transactions.map((trx, idx) => (
                  <tr key={trx.id || idx}>
                    <td data-label="Tanggal" className="tabular-nums text-xs">
                      {dateLabel(trx.date, true)} {trx.time || ''}
                    </td>
                    <td data-label="Pelanggan" className="font-semibold">
                      {trx.customer || '-'}
                    </td>
                    <td data-label="WO">
                      {trx.woId ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenWODetail({
                              idWO: trx.woId!,
                              tgl: trx.woDate || trx.date,
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
                        '-'
                      )}
                    </td>
                    <td data-label="Metode">{trx.method || 'Tunai'}</td>
                    <td data-label="Total" className="text-right tabular-nums font-bold">
                      {rp(trx.total)}
                    </td>
                    <td data-label="Laba" className="text-right tabular-nums">
                      {trx.costIncomplete ? (
                        <StatusChip status="warning" label="Parsial" />
                      ) : (
                        <span className="text-[var(--success)] font-bold">
                          {rp(trx.grossProfit)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] m-0">Tidak ada transaksi pada periode ini.</p>
        )}
      </section>

      {/* Stok Saat Ini & Pembelian/Pengeluaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="glass-panel p-5">
          <h2 className="text-[1rem] font-bold m-0 mb-3">Stok saat ini</h2>
          {products.length > 0 ? (
            <div className="glass-table-wrap max-h-[340px]">
              <table className="glass-table responsive-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Kategori</th>
                    <th className="text-right">Stok</th>
                    <th className="text-right">Jual</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 40).map((p) => (
                    <tr key={p[0]}>
                      <td data-label="Item" className="font-semibold">
                        {p[1]}
                      </td>
                      <td data-label="Kategori">{p[5]}</td>
                      <td data-label="Stok" className="text-right tabular-nums">
                        {p[5] === 'Jasa Servis' ? 'Jasa' : formatCount(p[4])}
                      </td>
                      <td data-label="Jual" className="text-right tabular-nums font-bold">
                        {rp(p[3])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)] m-0">Data stok belum dimuat.</p>
          )}
        </section>

        <section className="glass-panel p-5">
          <h2 className="text-[1rem] font-bold m-0 mb-3">Pembelian & pengeluaran</h2>
          {report && (report.purchases.length > 0 || report.expenses.length > 0) ? (
            <div className="glass-table-wrap max-h-[340px]">
              <table className="glass-table responsive-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Bukti</th>
                    <th className="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {report.purchases.map((p, idx) => {
                    const url = safeExternalHttpsUrl(p.receiptUrl);
                    return (
                      <tr key={`pur-${idx}`}>
                        <td data-label="Tanggal" className="text-xs tabular-nums">
                          {dateLabel(p.date, true)}
                        </td>
                        <td data-label="Keterangan">
                          <div className="font-semibold">{p.product}</div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {formatCount(p.qty)} unit · {p.staff || '-'}
                          </div>
                        </td>
                        <td data-label="Bukti">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[var(--primary)] hover:underline"
                            >
                              Lihat
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td data-label="Nominal" className="text-right tabular-nums font-bold">
                          {rp(p.total)}
                        </td>
                      </tr>
                    );
                  })}
                  {report.expenses.map((ex, idx) => (
                    <tr key={`exp-${idx}`}>
                      <td data-label="Tanggal" className="text-xs tabular-nums">
                        {dateLabel(ex.date, true)}
                      </td>
                      <td data-label="Keterangan">
                        <div className="font-semibold">{ex.category || 'Biaya'}</div>
                        <div className="text-[11px] text-[var(--muted)]">{ex.note || '-'}</div>
                      </td>
                      <td data-label="Bukti">—</td>
                      <td data-label="Nominal" className="text-right tabular-nums font-bold">
                        {rp(ex.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)] m-0">
              Belum ada catatan pembelian atau pengeluaran.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
