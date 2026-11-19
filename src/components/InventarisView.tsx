import React, { useMemo, useState } from 'react';
import {
  Edit3,
  LayoutGrid,
  List,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
} from 'lucide-react';
import type {
  InventoryStatusFilter,
  ProductRow,
  TopProductRow,
  ViewMode,
} from '../types/lbmm';
import { getProductStatus } from '../utils/business';
import { formatCount, rp } from '../utils/format';
import { InventoryCharts } from './InventoryCharts';
import { ProductMedia, StatusChip } from './LiquidPrimitives';

export function InventarisView({
  products,
  topProducts = [],
  loading,
  onRefresh,
  onAddProduct,
  onEditProduct,
  onOpenPurchase,
}: {
  products: ProductRow[];
  topProducts?: TopProductRow[];
  loading: boolean;
  onRefresh: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: ProductRow) => void;
  onOpenPurchase: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem('lbmm_product_view_inventory') === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const [limit, setLimit] = useState(60);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('lbmm_product_view_inventory', mode);
    } catch {
      // ignore
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((row) => {
      if (statusFilter !== 'all' && getProductStatus(row) !== statusFilter) return false;
      if (categoryFilter !== 'all' && String(row[5]) !== categoryFilter) return false;
      if (!q) return true;
      return `${row[0]} ${row[1]} ${row[5]}`.toLowerCase().includes(q);
    });
  }, [products, search, statusFilter, categoryFilter]);

  const visible = filtered.slice(0, limit);

  return (
    <div id="view-inventaris" className="ios-enter space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
          Inventaris
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-catat-pembelian"
            onClick={onOpenPurchase}
            className="ios-btn ios-btn-secondary"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Catat pembelian</span>
          </button>
          <button
            type="button"
            id="btn-tambah-produk"
            onClick={onAddProduct}
            className="ios-btn ios-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah produk</span>
          </button>
        </div>
      </div>

      {/* Interactive Inventory Visualizations */}
      <InventoryCharts
        products={products}
        topProducts={topProducts}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={(s) => {
          setStatusFilter(s);
          setLimit(60);
        }}
        activeCategory={categoryFilter}
        onSelectCategory={(c) => {
          setCategoryFilter(c);
          setLimit(60);
        }}
      />

      {/* Search & Controls */}
      <section className="glass-panel p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[210px]">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="inventory-search"
            type="search"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(60);
            }}
            className="ios-input ios-input-icon"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="ios-btn ios-btn-secondary min-h-[40px] text-xs text-[var(--primary)]"
            >
              Reset filter ({formatCount(filtered.length)})
            </button>
          )}

          <span className="text-xs font-semibold text-[var(--muted)] tabular-nums px-1">
            {formatCount(filtered.length)} item
          </span>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Muat ulang inventaris"
            className="ios-icon-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="ios-segmented grid-cols-2 w-[92px]" role="group" aria-label="Tampilan inventaris">
            <span
              className="ios-segmented-thumb"
              style={{
                width: 'calc((100% - 8px) / 2)',
                transform: `translateX(${viewMode === 'list' ? 100 : 0}%)`,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              aria-pressed={viewMode === 'grid'}
              aria-label="Tampilan grid"
              onClick={() => changeViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'list'}
              aria-label="Tampilan daftar"
              onClick={() => changeViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Inventory Catalog */}
      {visible.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5'
              : 'space-y-2.5'
          }
        >
          {visible.map((row) => {
            const [id, nama, modal, jual, stok, kategori, gambar] = row;
            const status = getProductStatus(row);
            const chipStatus =
              status === 'empty'
                ? 'danger'
                : status === 'low'
                ? 'warning'
                : status === 'service'
                ? 'neutral'
                : 'success';
            const chipLabel =
              status === 'service'
                ? 'Jasa Servis'
                : status === 'empty'
                ? 'Habis (0)'
                : status === 'low'
                ? `Menipis (${formatCount(stok)})`
                : `Stok ${formatCount(stok)}`;

            return viewMode === 'grid' ? (
              <article
                key={id}
                className="glass-card glass-card-interactive p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <ProductMedia src={gambar} category={kategori} className="w-16 h-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono-code text-[11px] font-semibold text-[var(--muted)]">
                        {id}
                      </span>
                      <StatusChip status={chipStatus} label={chipLabel} />
                    </div>
                    <h3 className="text-[0.92rem] font-bold m-0 mt-1 line-clamp-2">{nama}</h3>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{kategori}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border)]">
                  <div className="text-xs tabular-nums">
                    <div className="text-[var(--muted)]">Modal {rp(modal)}</div>
                    <div className="font-extrabold text-sm text-[var(--text)]">Jual {rp(jual)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditProduct(row)}
                    className="ios-btn ios-btn-secondary min-h-[36px] text-xs px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </article>
            ) : (
              <article
                key={id}
                className="glass-card glass-card-interactive p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ProductMedia src={gambar} category={kategori} className="w-12 h-12 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-code text-[11px] font-semibold text-[var(--muted)]">
                        {id}
                      </span>
                      <h3 className="text-[0.94rem] font-bold m-0 truncate">{nama}</h3>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{kategori}</span>
                      <span>·</span>
                      <span className="tabular-nums">Modal {rp(modal)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-auto">
                  <div className="text-right tabular-nums">
                    <div className="text-sm font-extrabold">{rp(jual)}</div>
                    <StatusChip status={chipStatus} label={chipLabel} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditProduct(row)}
                    aria-label={`Edit ${nama}`}
                    className="ios-icon-btn w-9 h-9 min-w-[36px] min-h-[36px]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-10 text-center text-sm text-[var(--muted)] flex flex-col items-center">
          <Package className="w-9 h-9 mb-2.5 opacity-45" />
          <p className="m-0 font-medium">
            {loading ? 'Memuat...' : 'Tidak ada produk.'}
          </p>
        </div>
      )}

      {filtered.length > limit && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setLimit((prev) => prev + 60)}
            className="ios-btn ios-btn-secondary"
          >
            Muat lainnya ({formatCount(filtered.length - limit)})
          </button>
        </div>
      )}
    </div>
  );
}
