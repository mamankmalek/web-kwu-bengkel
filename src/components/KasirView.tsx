import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import type {
  CartItem,
  ProductRow,
  ProofPayload,
  ViewMode,
  WorkOrder,
} from '../types/lbmm';
import { computeCartSummary, getProductStatus } from '../utils/business';
import { formatCount, rp } from '../utils/format';
import { readEvidenceFile } from '../utils/image';
import { ProductMedia, QRIS_IMAGE_URL, StatusChip } from './LiquidPrimitives';

export function KasirView({
  activeWO,
  products,
  cart,
  payMethod,
  paymentProof,
  loadingProducts,
  checkingOut,
  sendEmail,
  sendWa,
  emailInput,
  waInput,
  onSetPayMethod,
  onAddProduct,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onSetPaymentProof,
  onOpenCamera,
  onRefreshProducts,
  onSetSendEmail,
  onSetSendWa,
  onSetEmailInput,
  onSetWaInput,
  onCheckout,
  onNotify,
}: {
  activeWO: WorkOrder;
  products: ProductRow[];
  cart: CartItem[];
  payMethod: 'Tunai' | 'QRIS';
  paymentProof: ProofPayload | null;
  loadingProducts: boolean;
  checkingOut: boolean;
  sendEmail: boolean;
  sendWa: boolean;
  emailInput: string;
  waInput: string;
  onSetPayMethod: (m: 'Tunai' | 'QRIS') => void;
  onAddProduct: (product: ProductRow) => void;
  onUpdateCartQty: (index: number, delta: number) => void;
  onRemoveCartItem: (index: number) => void;
  onClearCart: () => void;
  onSetPaymentProof: (proof: ProofPayload | null) => void;
  onOpenCamera: () => void;
  onRefreshProducts: () => void;
  onSetSendEmail: (v: boolean) => void;
  onSetSendWa: (v: boolean) => void;
  onSetEmailInput: (v: string) => void;
  onSetWaInput: (v: string) => void;
  onCheckout: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem('lbmm_product_view_cashier') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [limit, setLimit] = useState(60);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('lbmm_product_view_cashier', mode);
    } catch {
      // ignore
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p[5]) set.add(String(p[5]));
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && String(p[5]) !== categoryFilter) return false;
      if (!q) return true;
      return `${p[0]} ${p[1]} ${p[5]}`.toLowerCase().includes(q);
    });
  }, [products, search, categoryFilter]);

  const visibleProducts = filteredProducts.slice(0, limit);
  const summary = useMemo(() => computeCartSummary(cart), [cart]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const image = await readEvidenceFile(file);
      onSetPaymentProof({ image, filename: 'bukti.jpg' });
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membaca foto.', 'warning');
    }
  };

  return (
    <div id="view-kasir" className="ios-enter space-y-4">
      {/* Active WO Banner */}
      <section className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-code text-xs font-extrabold px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
              {activeWO.idWO}
            </span>
            <h1 className="text-[1.1rem] md:text-[1.25rem] font-extrabold m-0 truncate">
              {activeWO.nama}
            </h1>
            <span className="font-mono-code text-xs font-semibold text-[var(--muted)]">
              {activeWO.nopol} · {activeWO.motor}
            </span>
          </div>
          {activeWO.keluhan && (
            <p className="text-xs text-[var(--muted)] m-0 mt-1 truncate">
              Keluhan: {activeWO.keluhan} (Penerima: {activeWO.penerima})
            </p>
          )}
        </div>
        <a href="#/daftar-wo" className="ios-btn ios-btn-secondary min-h-[38px] text-xs">
          Ganti WO
        </a>
      </section>

      {/* Split Workspace: Catalog (left) + Sticky Cart (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
        {/* Left: Catalog */}
        <section className="space-y-3">
          <div className="glass-panel p-3.5 md:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="cashier-search"
                  type="search"
                  placeholder="Cari produk, oli, atau jasa servis..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLimit(60);
                  }}
                  className="ios-input ios-input-icon"
                />
              </div>

              <button
                type="button"
                onClick={onRefreshProducts}
                disabled={loadingProducts}
                aria-label="Muat ulang produk"
                className="ios-icon-btn"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              </button>

              <div className="ios-segmented grid-cols-2 w-[92px]" role="group" aria-label="Tampilan produk">
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

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(cat);
                        setLimit(60);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[var(--primary)] text-white border-transparent'
                          : 'bg-[var(--surface-recessed)] text-[var(--muted)] border-transparent hover:text-[var(--text)]'
                      }`}
                    >
                      {cat === 'all' ? 'Semua' : cat}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-[var(--muted)] tabular-nums">
                {formatCount(filteredProducts.length)} item
              </span>
            </div>
          </div>

          {visibleProducts.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3'
                  : 'space-y-2'
              }
            >
              {visibleProducts.map((prod) => {
                const [id, nama, , jual, stok, kategori, gambar] = prod;
                const status = getProductStatus(prod);
                const outOfStock = kategori !== 'Jasa Servis' && Number(stok) <= 0;
                const inCartQty = cart.find((c) => String(c.id) === String(id))?.qty || 0;

                return viewMode === 'grid' ? (
                  <button
                    key={id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => onAddProduct(prod)}
                    className={`glass-card glass-card-interactive p-3 text-left flex flex-col justify-between gap-2.5 border ${
                      inCartQty > 0
                        ? 'border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]'
                        : 'border-[var(--glass-border)]'
                    } ${outOfStock ? 'opacity-55 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative">
                      <ProductMedia src={gambar} category={kategori} className="w-full h-24" />
                      {inCartQty > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[var(--primary)] text-white text-[11px] font-bold flex items-center justify-center shadow">
                          {inCartQty}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.84rem] font-bold leading-snug line-clamp-2">
                        {nama}
                      </div>
                      <div className="text-xs text-[var(--muted)] truncate">{kategori}</div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <span className="font-extrabold text-[0.86rem] tabular-nums text-[var(--primary)]">
                        {rp(jual)}
                      </span>
                      <StatusChip
                        status={
                          status === 'empty'
                            ? 'danger'
                            : status === 'low'
                            ? 'warning'
                            : status === 'service'
                            ? 'neutral'
                            : 'success'
                        }
                        label={kategori === 'Jasa Servis' ? 'Jasa' : `Stok ${stok}`}
                      />
                    </div>
                  </button>
                ) : (
                  <button
                    key={id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => onAddProduct(prod)}
                    className={`w-full glass-card glass-card-interactive p-3 text-left flex items-center justify-between gap-3 ${
                      inCartQty > 0 ? 'border-[var(--accent-border)]' : ''
                    } ${outOfStock ? 'opacity-55 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProductMedia src={gambar} category={kategori} className="w-12 h-12 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{nama}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {kategori} ·{' '}
                          {kategori === 'Jasa Servis' ? 'Layanan' : `Stok ${formatCount(stok)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inCartQty > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] text-xs font-bold tabular-nums">
                          ×{inCartQty}
                        </span>
                      )}
                      <span className="font-extrabold text-sm tabular-nums text-[var(--primary)]">
                        {rp(jual)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-8 text-center text-sm text-[var(--muted)]">
              Produk tidak ditemukan.
            </div>
          )}

          {filteredProducts.length > limit && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setLimit((prev) => prev + 60)}
                className="ios-btn ios-btn-secondary"
              >
                Tampilkan lainnya ({formatCount(filteredProducts.length - limit)} tersisa)
              </button>
            </div>
          )}
        </section>

        {/* Right: Sticky Cart & Checkout Panel */}
        <aside
          id="kasir-cart-panel"
          className="glass-panel p-4 md:p-5 lg:sticky lg:top-[76px] space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="text-[1rem] font-bold m-0">Pesanan</h2>
              <span className="status-chip neutral tabular-nums">{formatCount(summary.totalQty)}</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs font-semibold text-[var(--danger)] hover:underline bg-transparent border-0 p-0"
              >
                Kosongkan
              </button>
            )}
          </div>

          {cart.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="p-2.5 rounded-2xl bg-[var(--surface-recessed)]/70 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.nama}</div>
                    <div className="text-[0.72rem] text-[var(--muted)] tabular-nums">
                      {rp(item.harga)} · Subtotal {rp(item.subtotal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(idx, -1)}
                      aria-label={`Kurangi ${item.nama}`}
                      className="ios-icon-btn w-8 h-8 min-w-[32px] min-h-[32px] rounded-xl"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(idx, 1)}
                      aria-label={`Tambah ${item.nama}`}
                      className="ios-icon-btn w-8 h-8 min-w-[32px] min-h-[32px] rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveCartItem(idx)}
                      aria-label={`Hapus ${item.nama}`}
                      className="ios-icon-btn w-8 h-8 min-w-[32px] min-h-[32px] rounded-xl text-[var(--danger)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--muted)] rounded-2xl bg-[var(--surface-recessed)]/60">
              Pilih layanan atau suku cadang dari daftar di samping.
            </div>
          )}

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--muted)]">Metode pembayaran</div>
            <div className="ios-segmented grid-cols-2">
              <span
                className="ios-segmented-thumb"
                style={{
                  width: 'calc((100% - 8px) / 2)',
                  transform: `translateX(${payMethod === 'QRIS' ? 100 : 0}%)`,
                }}
                aria-hidden="true"
              />
              <button
                type="button"
                aria-pressed={payMethod === 'Tunai'}
                onClick={() => onSetPayMethod('Tunai')}
              >
                <Wallet className="w-4 h-4" />
                <span>Tunai</span>
              </button>
              <button
                type="button"
                aria-pressed={payMethod === 'QRIS'}
                onClick={() => onSetPayMethod('QRIS')}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS</span>
              </button>
            </div>

            {payMethod === 'QRIS' && (
              <div className="p-3 rounded-2xl bg-white text-[#1c1c1e] text-center border border-black/10 space-y-1.5">
                <img
                  src={QRIS_IMAGE_URL}
                  alt="Kode QRIS LBMM"
                  referrerPolicy="no-referrer"
                  className="w-44 h-44 mx-auto object-contain rounded-xl"
                />
                <p className="text-[11px] font-semibold text-neutral-600 m-0">
                  Pindai QRIS lalu lampirkan foto bukti transfer
                </p>
              </div>
            )}
          </div>

          {/* Bukti Pembayaran */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--muted)]">
                Bukti pembayaran {payMethod === 'QRIS' ? '(wajib)' : '(opsional)'}
              </span>
              {paymentProof && (
                <button
                  type="button"
                  onClick={() => onSetPaymentProof(null)}
                  className="text-[var(--danger)] font-semibold bg-transparent border-0 p-0"
                >
                  Hapus foto
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenCamera}
                className="ios-btn ios-btn-secondary text-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Kamera</span>
              </button>
              <label className="ios-btn ios-btn-secondary text-xs cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Pilih foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {paymentProof && (
              <div className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/5">
                <img
                  src={paymentProof.image}
                  alt="Pratinjau bukti pembayaran"
                  className="w-full max-h-36 object-cover"
                />
                <span className="absolute bottom-2 left-2 status-chip success backdrop-blur-md">
                  <CheckCircle2 className="w-3 h-3" /> Foto siap
                </span>
              </div>
            )}
          </div>

          {/* Kirim Nota Collapsible */}
          <details className="rounded-2xl bg-[var(--surface-recessed)]/70 p-3">
            <summary className="flex items-center justify-between text-xs font-semibold list-none">
              <span>Kirim nota ke pelanggan (Email / WhatsApp)</span>
              <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
            </summary>
            <div className="pt-3 space-y-2.5 text-xs">
              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => onSetSendEmail(e.target.checked)}
                />
                <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Kirim ke Email</span>
              </label>
              {sendEmail && (
                <input
                  type="email"
                  placeholder="email@pelanggan.com"
                  value={emailInput}
                  onChange={(e) => onSetEmailInput(e.target.value)}
                  className="ios-input min-h-[40px]"
                />
              )}

              <label className="flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWa}
                  onChange={(e) => onSetSendWa(e.target.checked)}
                />
                <MessageCircle className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Siapkan tautan WhatsApp</span>
              </label>
              {sendWa && (
                <input
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={waInput}
                  onChange={(e) => onSetWaInput(e.target.value)}
                  className="ios-input min-h-[40px]"
                />
              )}
            </div>
          </details>

          {/* Total & Bayar */}
          <div className="pt-2 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--muted)]">Total bayar</span>
              <strong className="text-xl font-extrabold tabular-nums text-[var(--text)]">
                {rp(summary.total)}
              </strong>
            </div>

            <button
              type="button"
              id="kasir-checkout"
              disabled={checkingOut || !cart.length}
              onClick={onCheckout}
              className="ios-btn ios-btn-primary w-full min-h-[48px] text-[0.95rem]"
            >
              {checkingOut ? 'Memproses...' : `Bayar · ${rp(summary.total)}`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
