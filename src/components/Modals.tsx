import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Printer,
  RefreshCw,
  Share2,
  Upload,
} from 'lucide-react';
import type {
  CameraTarget,
  LastTransactionData,
  ProductRow,
  ProofPayload,
  ShopProfile,
} from '../types/lbmm';
import { apiClient } from '../utils/api';
import { calcPurchaseTotal, calcPurchaseUnitCost } from '../utils/business';
import {
  formatCount,
  getProductPhoto,
  normalizeWhatsAppPhone,
  rp,
  todayInTimezone,
} from '../utils/format';
import { compressImage, readEvidenceFile } from '../utils/image';
import {
  prepareReceiptExport,
  PreparedReceipt,
  triggerFileDownload,
} from '../utils/receiptExport';
import { clearFormRequest, getOrCreateFormRequest } from '../utils/storage';
import { IosModal, LBMM_LOGO_URL } from './LiquidPrimitives';

const PRODUCT_CATEGORIES = ['Oli', 'Sparepart', 'Jasa Servis'];
const PURCHASE_STAFF = ['Dila', 'Kira', 'Mamad', 'Febri', 'Akmal', 'Radhit', 'Vanza', 'Meuthia', 'Kevin', 'Jawahir'];
const EXPENSE_CATEGORIES = ['Operasional', 'Listrik & air', 'Transportasi', 'Peralatan', 'Lainnya'];

/* ---------------- 1. Camera Modal ---------------- */
export function CameraModal({
  open,
  target,
  onClose,
  onCaptured,
  onNotify,
}: {
  open: boolean;
  target: CameraTarget;
  onClose: () => void;
  onCaptured: (dataUrl: string) => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    target === 'attendance' ? 'user' : 'environment'
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setFacingMode(target === 'attendance' ? 'user' : 'environment');
  }, [target, open]);

  useEffect(() => {
    if (!open) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setErrorMsg('');

    const startStream = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Kamera langsung tidak tersedia di browser ini. Gunakan Pilih foto.');
        return;
      }
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setErrorMsg('Kamera belum mendapat izin. Gunakan tombol Pilih foto di bawah.');
      }
    };

    startStream();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      onNotify('Kamera belum siap.', 'warning');
      return;
    }
    try {
      const dataUrl = compressImage(video, video.videoWidth, video.videoHeight);
      onCaptured(dataUrl);
      onClose();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengambil gambar.', 'error');
    }
  };

  const handleFileFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readEvidenceFile(file);
      onCaptured(dataUrl);
      onClose();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membaca file.', 'warning');
    }
  };

  return (
    <IosModal open={open} onClose={onClose} title="Kamera">
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {errorMsg && (
            <div className="absolute inset-0 p-4 bg-black/75 text-white text-xs text-center flex items-center justify-center">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
            }
            className="ios-btn ios-btn-secondary text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Putar kamera</span>
          </button>

          <label className="ios-btn ios-btn-secondary text-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Pilih foto</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileFallback}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleCapture}
            className="ios-btn ios-btn-primary text-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil foto</span>
          </button>
        </div>
      </div>
    </IosModal>
  );
}

/* ---------------- 2. Product Modal (Add / Edit) ---------------- */
export function ProductModal({
  open,
  editingProduct,
  onClose,
  onSaved,
  onNotify,
}: {
  open: boolean;
  editingProduct: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const isEdit = Boolean(editingProduct);
  const [id, setId] = useState('');
  const [nama, setNama] = useState('');
  const [modalPrice, setModalPrice] = useState('');
  const [jualPrice, setJualPrice] = useState('');
  const [stok, setStok] = useState('');
  const [kategori, setKategori] = useState('Sparepart');
  const [gambar, setGambar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setId(String(editingProduct[0] || ''));
      setNama(String(editingProduct[1] || ''));
      setModalPrice(String(editingProduct[2] ?? ''));
      setJualPrice(String(editingProduct[3] ?? ''));
      setStok(String(editingProduct[4] ?? '0'));
      setKategori(String(editingProduct[5] || 'Sparepart'));
      setGambar(String(editingProduct[6] || ''));
    } else {
      setId('');
      setNama('');
      setModalPrice('');
      setJualPrice('');
      setStok('0');
      setKategori('Sparepart');
      setGambar('');
    }
  }, [open, editingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImg = gambar.trim();
    if (cleanImg && !getProductPhoto(cleanImg)) {
      onNotify('Tautan gambar harus berupa URL HTTPS yang valid.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiClient.call(isEdit ? 'updateProduk' : 'tambahProduk', {
        obj: {
          id: id.trim(),
          nama: nama.trim(),
          modal: Number(modalPrice || 0),
          jual: Number(jualPrice || 0),
          stok: kategori === 'Jasa Servis' ? 0 : Number(stok || 0),
          kategori,
          gambar: cleanImg,
        },
      });
      onNotify(isEdit ? 'Produk diperbarui.' : 'Produk ditambahkan.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== 'STALE_SESSION') {
        onNotify(error.message || 'Gagal menyimpan produk.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <IosModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit produk' : 'Tambah produk'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isEdit && (
          <div className="space-y-1">
            <label htmlFor="prod-id" className="text-xs font-semibold text-[var(--muted)]">
              ID Produk
            </label>
            <input id="prod-id" className="ios-input font-mono-code" value={id} readOnly />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="prod-nama" className="text-xs font-semibold text-[var(--muted)]">
            Nama produk / layanan
          </label>
          <input
            id="prod-nama"
            className="ios-input"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="prod-kategori" className="text-xs font-semibold text-[var(--muted)]">
              Kategori
            </label>
            <select
              id="prod-kategori"
              className="ios-select"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="prod-stok" className="text-xs font-semibold text-[var(--muted)]">
              Stok
            </label>
            <input
              id="prod-stok"
              type="number"
              min="0"
              className="ios-input tabular-nums"
              value={kategori === 'Jasa Servis' ? '0' : stok}
              disabled={kategori === 'Jasa Servis'}
              onChange={(e) => setStok(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prod-modal" className="text-xs font-semibold text-[var(--muted)]">
              Harga modal
            </label>
            <input
              id="prod-modal"
              type="number"
              min="0"
              className="ios-input tabular-nums"
              value={modalPrice}
              onChange={(e) => setModalPrice(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prod-jual" className="text-xs font-semibold text-[var(--muted)]">
              Harga jual
            </label>
            <input
              id="prod-jual"
              type="number"
              min="0"
              className="ios-input tabular-nums"
              value={jualPrice}
              onChange={(e) => setJualPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="prod-gambar" className="text-xs font-semibold text-[var(--muted)]">
            Tautan gambar (Google Drive / HTTPS, opsional)
          </label>
          <input
            id="prod-gambar"
            type="url"
            className="ios-input"
            placeholder="https://drive.google.com/..."
            value={gambar}
            onChange={(e) => setGambar(e.target.value)}
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ios-btn ios-btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={saving} className="ios-btn ios-btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </IosModal>
  );
}

/* ---------------- 3. Purchase Modal (Catat Pembelian) ---------------- */
export function PurchaseModal({
  open,
  products,
  receiptPhoto,
  onSetReceiptPhoto,
  onOpenCamera,
  onClose,
  onSaved,
  onNotify,
}: {
  open: boolean;
  products: ProductRow[];
  receiptPhoto: ProofPayload | null;
  onSetReceiptPhoto: (proof: ProofPayload | null) => void;
  onOpenCamera: () => void;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const physicalProducts = products.filter((p) => p[5] !== 'Jasa Servis');
  const today = todayInTimezone();
  const [productId, setProductId] = useState('@new');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Sparepart');
  const [salePrice, setSalePrice] = useState('');
  const [date, setDate] = useState(today);
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [total, setTotal] = useState('');
  const [staff, setStaff] = useState(PURCHASE_STAFF[0]);
  const [supplier, setSupplier] = useState('');
  const [method, setMethod] = useState('Pakai uang sendiri');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const syncSelectedProduct = (nextId: string) => {
    setProductId(nextId);
    const matched = physicalProducts.find((p) => String(p[0]) === nextId);
    if (matched) {
      const nextCost = String(Number(matched[2]) || '');
      setUnitCost(nextCost);
      setSalePrice(String(Number(matched[3]) || ''));
      setNewCategory(String(matched[5] || 'Sparepart'));
      setTotal(calcPurchaseTotal(qty, nextCost));
    } else {
      setNewCategory('Sparepart');
      setSalePrice('');
    }
  };

  useEffect(() => {
    if (open) {
      const defaultId = physicalProducts[0]?.[0] || '@new';
      setDate(todayInTimezone());
      setNewName('');
      setQty('1');
      setSupplier('');
      setNote('');
      syncSelectedProduct(defaultId);
    }
  }, [open]);

  const handleQtyChange = (val: string) => {
    setQty(val);
    if (unitCost) setTotal(calcPurchaseTotal(val, unitCost));
  };

  const handleUnitCostChange = (val: string) => {
    setUnitCost(val);
    setTotal(calcPurchaseTotal(qty, val));
  };

  const handleTotalChange = (val: string) => {
    setTotal(val);
    setUnitCost(calcPurchaseUnitCost(qty, val));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const image = await readEvidenceFile(file);
      onSetReceiptPhoto({ image, filename: 'nota-pembelian.jpg' });
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membaca foto.', 'warning');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(qty);
    const numTotal = Number(total);
    const numUnitCost = Number(unitCost);
    const numSalePrice = Number(salePrice);
    const productMode = productId === '@new' ? 'new' : 'existing';
    if (productMode === 'new' && !newName.trim()) {
      onNotify('Masukkan nama produk baru.', 'warning');
      return;
    }
    if (
      !Number.isFinite(numQty) ||
      numQty <= 0 ||
      !Number.isFinite(numTotal) ||
      numTotal < 0 ||
      salePrice === ''
    ) {
      onNotify('Lengkapi jumlah, harga jual, dan nominal pembelian.', 'warning');
      return;
    }

    const requestId = getOrCreateFormRequest('purchase');
    setSaving(true);
    try {
      await apiClient.call('recordPurchase', {
        purchaseType: 'stock',
        productMode,
        productName: productMode === 'new' ? newName.trim() : '',
        productId: productMode === 'new' ? '' : productId,
        category: newCategory,
        qty: numQty,
        unitCost: numUnitCost,
        salePrice: numSalePrice,
        supplier: supplier.trim(),
        note: note.trim(),
        date,
        staff,
        method,
        total: numTotal,
        image: receiptPhoto?.image || '',
        requestId,
      });
      clearFormRequest('purchase');
      onSetReceiptPhoto(null);
      onNotify('Pembelian stok dicatat.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== 'STALE_SESSION') {
        onNotify(error.message || 'Gagal mencatat pembelian.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <IosModal open={open} onClose={onClose} title="Catat pembelian stok">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label htmlFor="pur-prod" className="text-xs font-semibold text-[var(--muted)]">
            Produk
          </label>
          <select
            id="pur-prod"
            className="ios-select"
            value={productId}
            onChange={(e) => syncSelectedProduct(e.target.value)}
          >
            <option value="@new">+ Buat produk baru</option>
            {physicalProducts.map((p) => (
              <option key={p[0]} value={p[0]}>
                {p[1]} (stok: {p[4]})
              </option>
            ))}
          </select>
        </div>

        {productId === '@new' && (
          <div className="p-3 rounded-2xl bg-[var(--surface-recessed)]/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Nama produk baru"
              className="ios-input sm:col-span-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <select
              className="ios-select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="Sparepart">Sparepart</option>
              <option value="Oli">Oli</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Harga jual"
              className="ios-input tabular-nums"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label htmlFor="pur-date" className="text-xs font-semibold text-[var(--muted)]">
              Tanggal pembelian
            </label>
            <input
              id="pur-date"
              type="date"
              max={today}
              className="ios-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {productId !== '@new' && (
            <div className="space-y-1">
              <label htmlFor="pur-sale-price" className="text-xs font-semibold text-[var(--muted)]">
                Harga jual per unit
              </label>
              <input
                id="pur-sale-price"
                type="number"
                min="0"
                className="ios-input tabular-nums"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <label htmlFor="pur-qty" className="text-xs font-semibold text-[var(--muted)]">
              Qty
            </label>
            <input
              id="pur-qty"
              type="number"
              min="1"
              className="ios-input tabular-nums"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pur-unit" className="text-xs font-semibold text-[var(--muted)]">
              Modal/unit
            </label>
            <input
              id="pur-unit"
              type="number"
              min="0"
              className="ios-input tabular-nums"
              value={unitCost}
              onChange={(e) => handleUnitCostChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pur-total" className="text-xs font-semibold text-[var(--muted)]">
              Total
            </label>
            <input
              id="pur-total"
              type="number"
              min="0"
              className="ios-input tabular-nums"
              value={total}
              onChange={(e) => handleTotalChange(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label htmlFor="pur-staff" className="text-xs font-semibold text-[var(--muted)]">
              Pembeli / Staf
            </label>
            <select
              id="pur-staff"
              className="ios-select"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
            >
              {PURCHASE_STAFF.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="pur-method" className="text-xs font-semibold text-[var(--muted)]">
              Sumber dana
            </label>
            <select
              id="pur-method"
              className="ios-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Pakai uang sendiri">Pakai uang sendiri</option>
              <option value="Cash pakai uang kaleng">Cash pakai uang kaleng</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            placeholder="Toko / Supplier (opsional)"
            className="ios-input"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <input
            type="text"
            placeholder="Catatan (opsional)"
            className="ios-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-semibold">Foto nota pembelian (opsional)</span>
            {receiptPhoto && (
              <button
                type="button"
                onClick={() => onSetReceiptPhoto(null)}
                className="text-[var(--danger)] font-semibold bg-transparent border-0 p-0"
              >
                Hapus
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
          {receiptPhoto && (
            <img
              src={receiptPhoto.image}
              alt="Nota pembelian"
              className="w-full max-h-32 object-cover rounded-xl border border-[var(--glass-border)]"
            />
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ios-btn ios-btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={saving} className="ios-btn ios-btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan pembelian'}
          </button>
        </div>
      </form>
    </IosModal>
  );
}

/* ---------------- 4. Expense Modal ---------------- */
export function ExpenseModal({
  open,
  onClose,
  onSaved,
  onNotify,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const today = todayInTimezone();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDate(todayInTimezone());
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || !date) {
      onNotify('Masukkan tanggal dan nominal pengeluaran yang valid.', 'warning');
      return;
    }

    const requestId = getOrCreateFormRequest('expense');
    setSaving(true);
    try {
      await apiClient.call('recordExpense', {
        requestId,
        category,
        amount: numAmount,
        note: note.trim(),
        date,
      });
      clearFormRequest('expense');
      setAmount('');
      setNote('');
      onNotify('Pengeluaran dicatat.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== 'STALE_SESSION') {
        onNotify(error.message || 'Gagal mencatat pengeluaran.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <IosModal open={open} onClose={onClose} title="Catat pengeluaran operasional">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="exp-cat" className="text-xs font-semibold text-[var(--muted)]">
              Kategori
            </label>
            <select
              id="exp-cat"
              className="ios-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="exp-date" className="text-xs font-semibold text-[var(--muted)]">
              Tanggal
            </label>
            <input
              id="exp-date"
              type="date"
              max={today}
              className="ios-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="exp-amount" className="text-xs font-semibold text-[var(--muted)]">
            Nominal (Rp)
          </label>
          <input
            id="exp-amount"
            type="number"
            min="1"
            className="ios-input tabular-nums"
            placeholder="50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="exp-note" className="text-xs font-semibold text-[var(--muted)]">
            Keterangan
          </label>
          <input
            id="exp-note"
            type="text"
            className="ios-input"
            placeholder="Beli lap majun, token listrik, dll"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ios-btn ios-btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={saving} className="ios-btn ios-btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan pengeluaran'}
          </button>
        </div>
      </form>
    </IosModal>
  );
}

/* ---------------- 5. Payment Confirm Modal ---------------- */
export function PaymentConfirmModal({
  open,
  customer,
  woId,
  total,
  method,
  hasProof,
  processing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  customer: string;
  woId: string;
  total: number;
  method: string;
  hasProof: boolean;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <IosModal open={open} onClose={onClose} title="Konfirmasi pembayaran" maxWidthClass="max-w-[440px]">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[var(--surface-recessed)]/80 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pelanggan</span>
            <strong>{customer}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">WO</span>
            <span className="font-mono-code font-bold">{woId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Metode</span>
            <strong>{method}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Bukti foto</span>
            <span>{hasProof ? 'Terlampir' : 'Tanpa foto'}</span>
          </div>
          <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center">
            <span className="font-semibold">Total bayar</span>
            <strong className="text-lg tabular-nums text-[var(--primary)]">{rp(total)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="ios-btn ios-btn-secondary w-full"
          >
            Periksa lagi
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={onConfirm}
            className="ios-btn ios-btn-primary w-full"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{processing ? 'Memproses...' : 'Bayar sekarang'}</span>
          </button>
        </div>
      </div>
    </IosModal>
  );
}

/* ---------------- 6. Receipt Modal (80mm Thermal + PDF/PNG Export) ---------------- */
export function ReceiptModal({
  open,
  data,
  profile,
  defaultWaPhone,
  onClose,
  onNotify,
}: {
  open: boolean;
  data: LastTransactionData | null;
  profile: ShopProfile;
  defaultWaPhone?: string;
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const [prepared, setPrepared] = useState<PreparedReceipt | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!open || !data) {
      setPrepared(null);
      return;
    }
    let cancelled = false;
    setPreparing(true);
    prepareReceiptExport({
      shop: {
        name: profile.nama || 'LBMM FT-IRS ITS',
        address: profile.alamat || '',
        phone: profile.hp || '',
      },
      id: data.idTrans || data.wo.idWO,
      date: data.tanggal || new Date().toLocaleString('id-ID'),
      wo: data.wo,
      items: data.items,
      total: data.total,
      method: data.metode,
    })
      .then((res) => {
        if (!cancelled) setPrepared(res);
      })
      .catch(() => {
        // fallback print still works
      })
      .finally(() => {
        if (!cancelled) setPreparing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, data, profile]);

  if (!data) return null;

  const shareFiles = async (files: { blob: Blob; name: string }[], typeLabel: string) => {
    const fileObjs = files.map((f) => new File([f.blob], f.name, { type: f.blob.type }));
    if (navigator.canShare && navigator.canShare({ files: fileObjs })) {
      try {
        await navigator.share({
          title: `Nota ${data.idTrans}`,
          files: fileObjs,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    triggerFileDownload(files);
    onNotify(`Nota ${typeLabel} diunduh (berbagi langsung tidak didukung browser).`, 'success');
  };

  const waDigits = normalizeWhatsAppPhone(defaultWaPhone || '');
  const waText = encodeURIComponent(
    `*${profile.nama || 'LBMM FT-IRS ITS'}*\nNota: ${data.idTrans}\nWO: ${data.wo.idWO}\nPelanggan: ${data.wo.nama} (${data.wo.nopol})\nTotal: ${rp(data.total)} (${data.metode})\nTerima kasih.`
  );
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <IosModal
      open={open}
      onClose={onClose}
      title="Nota pembayaran"
      maxWidthClass="max-w-[500px]"
      id="receipt-print-portal"
    >
      <div className="space-y-4">
        {/* 80mm Thermal Receipt Preview */}
        <div
          id="struk-area"
          className="mx-auto max-w-[330px] p-4 rounded-2xl bg-white text-[#171717] border border-black/10 shadow-sm text-xs font-mono-code leading-relaxed"
        >
          <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-neutral-400">
            <img
              src={LBMM_LOGO_URL}
              alt="Logo LBMM"
              referrerPolicy="no-referrer"
              className="receipt-logo h-8 mx-auto mb-1 object-contain"
              style={{ filter: 'url(#lbmm-logo-light)' }}
            />
            <div className="font-bold text-sm">{profile.nama || 'LBMM FT-IRS ITS'}</div>
            {profile.alamat && <div className="text-[11px] text-neutral-600">{profile.alamat}</div>}
            {profile.hp && <div className="text-[11px] text-neutral-600">{profile.hp}</div>}
            <div className="font-bold pt-1">NOTA PEMBAYARAN</div>
            <div className="text-[11px] text-neutral-600">{data.tanggal || '-'}</div>
          </div>

          <div className="py-2 space-y-0.5 border-b border-dashed border-neutral-400 text-[11px]">
            <div className="flex justify-between gap-2">
              <span>Transaksi</span>
              <span className="font-bold text-right">{data.idTrans}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>WO</span>
              <span className="text-right">{data.wo.idWO}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Nama</span>
              <span className="text-right">{data.wo.nama}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>No. Polisi</span>
              <span className="text-right">{data.wo.nopol}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Motor</span>
              <span className="text-right">{data.wo.motor}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Metode</span>
              <span className="font-bold text-right">{data.metode}</span>
            </div>
          </div>

          <div className="py-2 space-y-1.5 border-b border-dashed border-neutral-400">
            {data.items.map((item, idx) => (
              <div key={`${item.id}-${idx}`}>
                <div className="font-bold">{item.nama}</div>
                <div className="flex justify-between text-[11px] text-neutral-700">
                  <span>
                    {formatCount(item.qty)} x {rp(item.harga)}
                  </span>
                  <span>{rp(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-sm font-bold">
            <span>TOTAL</span>
            <span>{rp(data.total)}</span>
          </div>
          <div className="text-center text-[11px] text-neutral-600 pt-2">Terima kasih.</div>
        </div>

        {/* Actions */}
        <div className="no-print grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={preparing || !prepared}
            onClick={() => prepared && triggerFileDownload([prepared.pdf])}
            className="ios-btn ios-btn-secondary text-xs"
          >
            <FileText className="w-4 h-4" />
            <span>{preparing ? 'Menyiapkan...' : 'Unduh PDF'}</span>
          </button>
          <button
            type="button"
            disabled={preparing || !prepared}
            onClick={() => prepared && triggerFileDownload(prepared.photos)}
            className="ios-btn ios-btn-secondary text-xs"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Unduh Foto</span>
          </button>
          <button
            type="button"
            disabled={preparing || !prepared}
            onClick={() => prepared && shareFiles([prepared.pdf], 'PDF')}
            className="ios-btn ios-btn-secondary text-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan PDF</span>
          </button>
          <button
            type="button"
            disabled={preparing || !prepared}
            onClick={() => prepared && shareFiles(prepared.photos, 'Foto')}
            className="ios-btn ios-btn-secondary text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Bagikan Foto</span>
          </button>
        </div>

        <div className="no-print grid grid-cols-2 gap-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ios-btn ios-btn-secondary text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="ios-btn ios-btn-primary text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak 80mm</span>
          </button>
        </div>
      </div>
    </IosModal>
  );
}
