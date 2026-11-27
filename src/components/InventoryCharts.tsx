import React, { useMemo, useState } from 'react';
import { BarChart3, Layers, AlertTriangle, TrendingUp } from 'lucide-react';
import type {
  InventoryStatusFilter,
  ProductRow,
  TopProductRow,
} from '../types/lbmm';
import {
  computeInventoryAnalytics,
  isServiceCategory,
  normalizeProductCategory,
} from '../utils/business';
import { formatCount, rp } from '../utils/format';

type SegmentKey = Exclude<InventoryStatusFilter, 'all'>;

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; color: string; chipClass: string }
> = {
  safe: {
    label: 'Stok Aman (>5)',
    color: 'var(--chart-profit)',
    chipClass: 'success',
  },
  low: {
    label: 'Menipis (1–5)',
    color: 'var(--warning-bright)',
    chipClass: 'warning',
  },
  empty: {
    label: 'Habis (0)',
    color: 'var(--primary)',
    chipClass: 'danger',
  },
  service: {
    label: 'Jasa Servis',
    color: 'var(--chart-info)',
    chipClass: 'neutral',
  },
};

export function InventoryCharts({
  products,
  topProducts = [],
  activeStatusFilter,
  onSelectStatusFilter,
  activeCategory,
  onSelectCategory,
}: {
  products: ProductRow[];
  topProducts?: TopProductRow[];
  activeStatusFilter: InventoryStatusFilter;
  onSelectStatusFilter: (status: InventoryStatusFilter) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}) {
  const analytics = useMemo(() => computeInventoryAnalytics(products), [products]);
  const [hoveredSeg, setHoveredSeg] = useState<SegmentKey | null>(null);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [hoveredUsageId, setHoveredUsageId] = useState<string | null>(null);

  const segments = useMemo(() => {
    const raw: { key: SegmentKey; count: number }[] = [
      { key: 'safe', count: analytics.safeCount },
      { key: 'low', count: analytics.lowCount },
      { key: 'empty', count: analytics.emptyCount },
      { key: 'service', count: analytics.serviceSku },
    ];
    const total = Math.max(1, analytics.totalSku);
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return raw.map((seg) => {
      const fraction = seg.count / total;
      const dash = fraction * circumference;
      const currentOffset = offset;
      offset += dash;
      return {
        ...seg,
        ...SEGMENT_META[seg.key],
        pct: Math.round(fraction * 100),
        dash,
        offset: currentOffset,
        circumference,
      };
    });
  }, [analytics]);

  const activeSeg =
    segments.find((s) => s.key === hoveredSeg) ||
    segments.find((s) => s.key === activeStatusFilter) ||
    null;

  const maxCatUnits = Math.max(
    1,
    ...analytics.categories.map((c) => c.totalUnits || c.skuCount)
  );

  // Merge usage frequency from topProducts if available; otherwise show lowest-stock watchlist
  const usageRows = useMemo(() => {
    if (topProducts.length > 0) {
      return topProducts.slice(0, 5).map((item) => {
        const prod = products.find((p) => String(p[0]) === String(item.id));
        return {
          id: item.id,
          name: item.name,
          category: normalizeProductCategory(item.category || (prod ? prod[5] : 'Produk')),
          qty: Number(item.qty) || 0,
          revenue: Number(item.revenue) || 0,
          stock: prod ? Number(prod[4]) : null,
        };
      });
    }
    return [];
  }, [topProducts, products]);

  const maxUsageQty = Math.max(1, ...usageRows.map((r) => r.qty));

  if (!products.length) return null;

  return (
    <section
      aria-label="Visualisasi data inventaris"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-5"
    >
      {/* 1. Status Bagian & Komposisi Stok (Donut Interaktif) */}
      <article className="glass-panel p-5 lg:col-span-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="text-[0.95rem] font-bold m-0">Status Inventaris</h2>
          </div>
          {activeStatusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectStatusFilter('all')}
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row items-center gap-4 my-auto">
          <div className="relative w-[132px] h-[132px] shrink-0">
            <svg
              viewBox="0 0 120 120"
              className="w-full h-full -rotate-90"
              role="img"
              aria-label="Diagram status stok inventaris"
            >
              <circle
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke="var(--surface-recessed)"
                strokeWidth="13"
              />
              {segments.map((seg) => {
                if (seg.count <= 0) return null;
                const isSelected =
                  activeStatusFilter === seg.key || hoveredSeg === seg.key;
                return (
                  <circle
                    key={seg.key}
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isSelected ? '16' : '13'}
                    strokeDasharray={`${Math.max(0, seg.dash - 2)} ${seg.circumference}`}
                    strokeDashoffset={-seg.offset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredSeg(seg.key)}
                    onMouseLeave={() => setHoveredSeg(null)}
                    onClick={() =>
                      onSelectStatusFilter(
                        activeStatusFilter === seg.key ? 'all' : seg.key
                      )
                    }
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-[1.3rem] font-extrabold tabular-nums leading-none">
                {activeSeg ? formatCount(activeSeg.count) : formatCount(analytics.totalSku)}
              </span>
              <span className="text-[0.68rem] font-medium text-[var(--muted)] mt-1 leading-tight">
                {activeSeg ? `${activeSeg.pct}% SKU` : 'Total SKU'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full">
            {segments.map((seg) => {
              const active = activeStatusFilter === seg.key;
              return (
                <button
                  key={seg.key}
                  type="button"
                  onMouseEnter={() => setHoveredSeg(seg.key)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  onClick={() =>
                    onSelectStatusFilter(active ? 'all' : seg.key)
                  }
                  aria-pressed={active}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-all border ${
                    active
                      ? 'bg-[var(--surface-elevated)] border-[var(--accent-border)] shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-[var(--surface-recessed)]'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{seg.label}</span>
                  </span>
                  <strong className="tabular-nums font-bold shrink-0">
                    {formatCount(seg.count)}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Total: {formatCount(analytics.totalUnits)} unit</span>
          <span className="tabular-nums font-semibold text-[var(--text)]">
            Modal {rp(analytics.totalModalValue)}
          </span>
        </div>
      </article>

      {/* 2. Distribusi Kategori & Valuasi Stok */}
      <article className="glass-panel p-5 lg:col-span-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="text-[0.95rem] font-bold m-0">Stok per Kategori</h2>
          </div>
          {activeCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Semua
            </button>
          )}
        </div>

        <div className="space-y-3 my-auto">
          {analytics.categories.map((cat) => {
            const isService = isServiceCategory(cat.name);
            const metricVal = isService ? cat.skuCount : cat.totalUnits;
            const widthPct = Math.max(8, Math.min(100, (metricVal / maxCatUnits) * 100));
            const selected = activeCategory === cat.name;
            const hovered = hoveredCat === cat.name;

            return (
              <button
                key={cat.name}
                type="button"
                onMouseEnter={() => setHoveredCat(cat.name)}
                onMouseLeave={() => setHoveredCat(null)}
                onClick={() => onSelectCategory(selected ? 'all' : cat.name)}
                aria-pressed={selected}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  selected
                    ? 'bg-[var(--surface-elevated)] border-[var(--accent-border)] shadow-sm'
                    : 'bg-[var(--surface-recessed)]/50 border-transparent hover:bg-[var(--surface-recessed)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                  <span className="font-semibold text-[var(--text)]">
                    {cat.name}{' '}
                    <span className="text-[var(--muted)] font-normal">
                      ({formatCount(cat.skuCount)} SKU)
                    </span>
                  </span>
                  <span className="tabular-nums font-bold text-[var(--text)]">
                    {isService ? `${formatCount(cat.skuCount)} layanan` : `${formatCount(cat.totalUnits)} unit`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      background: isService
                        ? 'var(--chart-info)'
                        : cat.lowOrEmpty > 0
                        ? 'var(--warning-bright)'
                        : 'var(--primary)',
                    }}
                  />
                </div>
                {(cat.lowOrEmpty > 0 || (!isService && (hovered || selected))) && (
                  <div className="flex items-center justify-between text-[0.7rem] text-[var(--muted)] mt-1.5 tabular-nums">
                    <span>
                      {cat.lowOrEmpty > 0 ? `${cat.lowOrEmpty} perlu restok` : ''}
                    </span>
                    {!isService && <span>Nilai jual {rp(cat.retailValue)}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Potensi jual</span>
          <span className="tabular-nums font-bold text-[var(--success)]">
            {rp(analytics.totalRetailValue)}
          </span>
        </div>
      </article>

      {/* 3. Frekuensi Pemakaian Item / Pantauan Stok Kritis */}
      <article className="glass-panel p-5 md:col-span-2 lg:col-span-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {usageRows.length > 0 ? (
              <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--warning-bright)]" />
            )}
            <h2 className="text-[0.95rem] font-bold m-0">
              {usageRows.length > 0 ? 'Item Terlaris' : 'Stok Terendah'}
            </h2>
          </div>
          <span className="text-[0.72rem] text-[var(--muted)]">
            {usageRows.length > 0 ? 'Bulan ini' : 'Terendah'}
          </span>
        </div>

        {usageRows.length > 0 ? (
          <div className="space-y-2.5 my-auto">
            {usageRows.map((item) => {
              const pct = Math.max(10, Math.min(100, (item.qty / maxUsageQty) * 100));
              const isHover = hoveredUsageId === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredUsageId(item.id)}
                  onMouseLeave={() => setHoveredUsageId(null)}
                  className="p-2 rounded-xl hover:bg-[var(--surface-recessed)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold truncate">{item.name}</span>
                    <span className="tabular-nums font-bold text-[var(--primary)] shrink-0">
                      {formatCount(item.qty)}× pakai
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: isServiceCategory(item.category)
                          ? 'var(--chart-info)'
                          : 'var(--primary)',
                      }}
                    />
                  </div>
                  {isHover && (
                    <div className="flex justify-between text-[0.7rem] text-[var(--muted)] mt-1 tabular-nums">
                      <span>{item.category}</span>
                      <span>
                        Omzet {rp(item.revenue)}
                        {item.stock !== null && !isServiceCategory(item.category)
                          ? ` · Sisa ${item.stock}`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5 my-auto">
            {analytics.watchlist.slice(0, 5).map((item) => {
              const maxWatch = Math.max(
                10,
                ...analytics.watchlist.slice(0, 5).map((w) => w.stock)
              );
              const pct = item.stock === 0 ? 4 : Math.max(10, (item.stock / maxWatch) * 100);
              return (
                <div key={item.id} className="p-1.5 rounded-xl">
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold truncate">{item.name}</span>
                    <span
                      className={`tabular-nums font-bold shrink-0 ${
                        item.status === 'empty'
                          ? 'text-[var(--danger)]'
                          : item.status === 'low'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--success)]'
                      }`}
                    >
                      {item.stock === 0 ? 'Habis' : `${formatCount(item.stock)} unit`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background:
                          item.status === 'empty'
                            ? 'var(--primary)'
                            : item.status === 'low'
                            ? 'var(--warning-bright)'
                            : 'var(--chart-profit)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Estimasi margin</span>
          <span className="tabular-nums font-semibold text-[var(--text)]">
            +{rp(analytics.potentialMargin)}
          </span>
        </div>
      </article>
    </section>
  );
}
