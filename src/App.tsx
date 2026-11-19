/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import type {
  AuthState,
  CameraTarget,
  CartItem,
  LastTransactionData,
  PendingProof,
  ProductRow,
  ProofPayload,
  ReportData,
  ReportPreset,
  RouteKey,
  ShopProfile,
  ThemeMode,
  ToastMessage,
  WorkOrder,
  WorkOrderDetailResponse,
} from './types/lbmm';
import { apiClient } from './utils/api';
import {
  addCartItem,
  computeCartSummary,
  computePresetRange,
  updateCartItemQty,
  validateReportData,
} from './utils/business';
import { formatCount, labelTgl, rp, todayInTimezone, validDay } from './utils/format';
import {
  EMPTY_WO,
  loadAuth,
  loadPendingProof,
  loadSessionState,
  newRequestId,
  writeStored,
} from './utils/storage';
import { LbmmLogoFilter } from './components/LiquidPrimitives';
import { LoginScreen } from './components/LoginScreen';
import { AppShell } from './components/AppShell';
import { HomeView } from './components/HomeView';
import { WoCreateView } from './components/WoCreateView';
import { WoListView } from './components/WoListView';
import { KasirView } from './components/KasirView';
import { InventarisView } from './components/InventarisView';
import { LaporanView } from './components/LaporanView';
import { AbsenView } from './components/AbsenView';
import {
  CameraModal,
  ExpenseModal,
  PaymentConfirmModal,
  ProductModal,
  PurchaseModal,
  ReceiptModal,
} from './components/Modals';

interface ParsedHashRoute {
  route: RouteKey;
  woDetailId: string | null;
  woDetailTgl: string | null;
}

const VALID_ROUTES = new Set<RouteKey>([
  'home',
  'wo',
  'daftar-wo',
  'kasir',
  'inventaris',
  'laporan',
  'absen',
]);

const ROUTE_TITLES: Record<RouteKey, string> = {
  home: 'Ringkasan',
  wo: 'WO Baru',
  'daftar-wo': 'Daftar WO',
  kasir: 'Kasir',
  inventaris: 'Inventaris',
  laporan: 'Laporan',
  absen: 'Absen KWU',
};

function parseHashRoute(hash: string): ParsedHashRoute {
  const clean = (hash || '#/').replace(/^#\/?/, '');
  const [rawPath, rawQuery] = clean.split('?');
  const parts = (rawPath || '').split('/').filter(Boolean);
  const head = (parts[0] || 'home') as RouteKey;
  const route: RouteKey = VALID_ROUTES.has(head) ? head : 'home';

  if (route === 'daftar-wo' && parts[1]) {
    const params = new URLSearchParams(rawQuery || '');
    return {
      route,
      woDetailId: decodeURIComponent(parts[1]),
      woDetailTgl: params.get('tgl'),
    };
  }
  return { route, woDetailId: null, woDetailTgl: null };
}

function getInitialTheme(): ThemeMode {
  try {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [authError, setAuthError] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  const initialSession = useMemo(() => loadSessionState(), []);
  const [cart, setCart] = useState<CartItem[]>(initialSession.CART);
  const [activeWO, setActiveWO] = useState<WorkOrder>(initialSession.activeWO);
  const [checkoutRequest, setCheckoutRequest] = useState<string | null>(
    initialSession.checkoutRequest
  );
  const [pendingProof, setPendingProof] = useState<PendingProof | null>(() =>
    loadPendingProof()
  );

  const [parsedRoute, setParsedRoute] = useState<ParsedHashRoute>(() =>
    parseHashRoute(window.location.hash)
  );
  const [menuOpen, setMenuOpen] = useState(false);

  // Data state
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [profile, setProfile] = useState<ShopProfile>({
    nama: 'LBMM FT-IRS ITS',
    alamat: 'Gedung Teknik Mesin FT-IRS ITS, Surabaya',
    hp: '',
  });
  const [homeReport, setHomeReport] = useState<ReportData | null>(null);
  const [fullReport, setFullReport] = useState<ReportData | null>(null);
  const [todayWOList, setTodayWOList] = useState<WorkOrder[]>([]);
  const [woListDate, setWoListDate] = useState<string>(() => todayInTimezone('Asia/Jakarta'));
  const [woListRows, setWoListRows] = useState<WorkOrder[]>([]);
  const [woDetail, setWoDetail] = useState<WorkOrderDetailResponse | null>(null);

  // Report controls
  const [reportPreset, setReportPreset] = useState<ReportPreset>('month');
  const [reportStart, setReportStart] = useState<string>(
    () => computePresetRange('month', todayInTimezone('Asia/Jakarta')).start
  );
  const [reportEnd, setReportEnd] = useState<string>(() => todayInTimezone('Asia/Jakarta'));

  // Loading states
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingWoList, setLoadingWoList] = useState(false);
  const [loadingWoDetail, setLoadingWoDetail] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [retryingProof, setRetryingProof] = useState(false);

  // Kasir & Evidence states
  const [payMethod, setPayMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [paymentProof, setPaymentProof] = useState<ProofPayload | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWa, setSendWa] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [purchaseReceiptPhoto, setPurchaseReceiptPhoto] = useState<ProofPayload | null>(null);
  const [attendanceRawPhoto, setAttendanceRawPhoto] = useState('');

  // Modals
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>('proof');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTrxData, setLastTrxData] = useState<LastTransactionData | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
      const id = Date.now();
      setToast({ id, message, type });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setToast((cur) => (cur?.id === id ? null : cur));
      }, 3600);
    },
    []
  );

  // Keep authRef fresh for apiClient
  const authRef = useRef<AuthState | null>(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  const handleSessionExpired = useCallback((msg: string) => {
    try {
      sessionStorage.removeItem('lbmm_auth');
    } catch {
      // ignore
    }
    setAuth(null);
    setAuthError(msg);
    apiClient.invalidate(true);
  }, []);

  useEffect(() => {
    apiClient.configure({
      getAuth: () => authRef.current,
      onAuthExpired: handleSessionExpired,
      onTimezone: (tz) => setTimezone(tz),
    });
  }, [handleSessionExpired]);

  // Persist session state
  useEffect(() => {
    writeStored('lbmm_state', {
      CART: cart,
      activeWO,
      checkoutRequest,
    });
  }, [cart, activeWO, checkoutRequest]);

  useEffect(() => {
    writeStored('lbmm_pending_proof', pendingProof);
  }, [pendingProof]);

  // Theme Sync
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('lbmm_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Hash Listener
  useEffect(() => {
    const onHashChange = () => {
      setParsedRoute(parseHashRoute(window.location.hash));
      setMenuOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((hash: string) => {
    if (window.location.hash === hash) {
      setParsedRoute(parseHashRoute(hash));
    } else {
      window.location.hash = hash;
    }
  }, []);

  // Kasir guard: require an active WO
  useEffect(() => {
    if (auth && parsedRoute.route === 'kasir' && activeWO.idWO === '-') {
      notify('Buat atau pilih WO untuk membuka kasir.', 'warning');
      navigate('#/wo');
    }
  }, [auth, parsedRoute.route, activeWO.idWO, navigate, notify]);

  // Data Loaders
  const loadProducts = useCallback(
    async (fresh = false) => {
      if (!authRef.current) return;
      setLoadingProducts(true);
      try {
        const res = await apiClient.call<ProductRow[] | { data?: ProductRow[] }>(
          'getProduk',
          fresh ? { fresh: true } : {}
        );
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setProducts(list);
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code !== 'STALE_SESSION') {
          notify(error.message || 'Gagal memuat produk.', 'error');
        }
      } finally {
        setLoadingProducts(false);
      }
    },
    [notify]
  );

  const loadProfile = useCallback(async () => {
    if (!authRef.current) return;
    try {
      const res = await apiClient.call<Partial<ShopProfile>>('getProfil');
      if (res && (res.nama || res.alamat || res.hp)) {
        setProfile((prev) => ({
          nama: res.nama || prev.nama,
          alamat: res.alamat || prev.alamat,
          hp: res.hp || prev.hp,
        }));
      }
    } catch {
      // keep defaults
    }
  }, []);

  const loadHomeData = useCallback(
    async (fresh = false) => {
      if (!authRef.current) return;
      setLoadingHome(true);
      const today = todayInTimezone(timezone);
      try {
        const [repRaw, woRaw] = await Promise.all([
          apiClient.call('getLaporan', fresh ? { fresh: true } : {}, {
            isHomeRoute: true,
          }),
          apiClient.call<WorkOrder[] | { list?: WorkOrder[]; data?: WorkOrder[] }>('getWOList', {
            tgl: today,
            ...(fresh ? { fresh: true } : {}),
          }),
        ]);
        const validRep = validateReportData(repRaw);
        setHomeReport(validRep);
        const woRows = Array.isArray(woRaw)
          ? woRaw
          : Array.isArray(woRaw?.list)
          ? woRaw.list
          : Array.isArray(woRaw?.data)
          ? woRaw.data
          : [];
        setTodayWOList(woRows);
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code !== 'STALE_SESSION') {
          notify(error.message || 'Gagal memuat ringkasan.', 'error');
        }
      } finally {
        setLoadingHome(false);
      }
    },
    [notify, timezone]
  );

  const loadWoList = useCallback(
    async (tgl: string, fresh = false) => {
      if (!authRef.current) return;
      setLoadingWoList(true);
      try {
        const res = await apiClient.call<WorkOrder[] | { list?: WorkOrder[]; data?: WorkOrder[] }>('getWOList', {
          tgl,
          ...(fresh ? { fresh: true } : {}),
        });
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.list)
          ? res.list
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setWoListRows(list);
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code !== 'STALE_SESSION') {
          notify(error.message || 'Gagal memuat daftar WO.', 'error');
        }
      } finally {
        setLoadingWoList(false);
      }
    },
    [notify]
  );

  const loadTodayWOs = useCallback(async () => {
    if (!authRef.current) return;
    const today = todayInTimezone(timezone);
    try {
      const woRaw = await apiClient.call<WorkOrder[] | { list?: WorkOrder[]; data?: WorkOrder[] }>(
        'getWOList',
        { tgl: today }
      );
      const woRows = Array.isArray(woRaw)
        ? woRaw
        : Array.isArray(woRaw?.list)
        ? woRaw.list
        : Array.isArray(woRaw?.data)
        ? woRaw.data
        : [];
      setTodayWOList(woRows);
    } catch {
      // silent background check for used WO numbers
    }
  }, [timezone]);

  const loadWoDetail = useCallback(
    async (idWO: string, tgl: string) => {
      if (!authRef.current) return;
      setLoadingWoDetail(true);
      try {
        const res = await apiClient.call<WorkOrderDetailResponse>('getWODetail', {
          idWO,
          tgl,
        });
        setWoDetail(res);
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code !== 'STALE_SESSION') {
          notify(error.message || 'Gagal memuat detail WO.', 'error');
        }
        setWoDetail(null);
      } finally {
        setLoadingWoDetail(false);
      }
    },
    [notify]
  );

  const loadFullReport = useCallback(
    async (start: string, end: string, fresh = false) => {
      if (!authRef.current) return;
      setLoadingReport(true);
      try {
        const raw = await apiClient.call('getLaporan', {
          start,
          end,
          ...(fresh ? { fresh: true } : {}),
        });
        setFullReport(validateReportData(raw));
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code !== 'STALE_SESSION') {
          notify(error.message || 'Gagal memuat laporan.', 'error');
        }
      } finally {
        setLoadingReport(false);
      }
    },
    [notify]
  );

  // Initial load on auth
  useEffect(() => {
    if (!auth) return;
    loadProfile();
    loadProducts();
  }, [auth, loadProfile, loadProducts]);

  // Route-triggered data loading
  useEffect(() => {
    if (!auth) return;
    const { route, woDetailId, woDetailTgl } = parsedRoute;

    if (route === 'home') {
      loadHomeData();
    } else if (route === 'wo') {
      loadTodayWOs();
    } else if (route === 'daftar-wo') {
      if (woDetailId) {
        const targetTgl = validDay(woDetailTgl) ? woDetailTgl! : woListDate;
        loadWoDetail(woDetailId, targetTgl);
      } else {
        setWoDetail(null);
        loadWoList(woListDate);
      }
    } else if (route === 'kasir') {
      if (!products.length) loadProducts();
    } else if (route === 'inventaris') {
      loadProducts();
      if (!fullReport) {
        const { start, end } = computePresetRange('month', todayInTimezone(timezone));
        loadFullReport(start, end);
      }
    } else if (route === 'laporan') {
      if (!products.length) loadProducts();
      loadFullReport(reportStart, reportEnd);
    }
  }, [
    auth,
    parsedRoute,
    woListDate,
    reportStart,
    reportEnd,
    timezone,
    loadHomeData,
    loadTodayWOs,
    loadWoDetail,
    loadWoList,
    loadProducts,
    loadFullReport,
    products.length,
    fullReport,
  ]);

  // Auth Actions
  const handleLogin = async (password: string) => {
    const res = await apiClient.call<{
      token: string;
      expiresAt?: number;
      ttlSeconds?: number;
    }>('login', { password });

    const expiresAt =
      res.expiresAt || Date.now() + (Number(res.ttlSeconds || 28800) * 1000);
    const nextAuth: AuthState = { token: res.token, expiresAt };
    writeStored('lbmm_auth', nextAuth);
    setAuthError('');
    setAuth(nextAuth);
  };

  const handleLogout = async () => {
    try {
      await apiClient.call('logout');
    } catch {
      // best effort
    }
    try {
      sessionStorage.removeItem('lbmm_auth');
    } catch {
      // ignore
    }
    setAuth(null);
    apiClient.invalidate(true);
  };

  // Cart & Checkout
  const handleAddProduct = (prod: ProductRow) => {
    const { nextCart, error } = addCartItem(cart, prod);
    if (error) {
      notify(error, 'warning');
      return;
    }
    setCart(nextCart);
    setCheckoutRequest(null);
  };

  const handleUpdateCartQty = (idx: number, delta: number) => {
    const { nextCart, error } = updateCartItemQty(cart, idx, delta, products);
    if (error) {
      notify(error, 'warning');
      return;
    }
    setCart(nextCart);
    setCheckoutRequest(null);
  };

  const handleRemoveCartItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
    setCheckoutRequest(null);
  };

  const handleClearCart = () => {
    setCart([]);
    setCheckoutRequest(null);
  };

  const initiateCheckout = () => {
    if (activeWO.idWO === '-') {
      notify('Pilih WO terlebih dahulu.', 'warning');
      navigate('#/wo');
      return;
    }
    if (!cart.length) {
      notify('Tambahkan item servis atau produk terlebih dahulu.', 'warning');
      return;
    }
    if (payMethod === 'QRIS' && !paymentProof) {
      notify('Pembayaran QRIS membutuhkan foto bukti pembayaran.', 'warning');
      return;
    }
    setConfirmPayOpen(true);
  };

  const executeCheckout = async () => {
    if (checkingOut) return;
    const reqId = checkoutRequest || newRequestId();
    if (!checkoutRequest) setCheckoutRequest(reqId);

    const summary = computeCartSummary(cart);
    setCheckingOut(true);
    try {
      const res = await apiClient.call<{
        idTrans?: string;
        tanggal?: string;
        total?: number;
        items?: CartItem[];
        metode?: string;
        proofUrl?: string;
      }>('prosesTransaksi', {
        cart,
        total: summary.total,
        metode: payMethod,
        email: sendEmail ? emailInput.trim() : '',
        woInfo: activeWO,
        requestId: reqId,
      });

      const idTrans = res.idTrans || activeWO.idWO;
      let uploadedProofUrl = res.proofUrl || '';
      const proofSnapshot = paymentProof;

      if (proofSnapshot && !uploadedProofUrl) {
        try {
          const uploadRes = await apiClient.call<{ proofUrl?: string; url?: string }>('uploadBukti', {
            idTrans,
            image: proofSnapshot.image,
            filename: proofSnapshot.filename,
          });
          uploadedProofUrl = uploadRes?.proofUrl || uploadRes?.url || '';
          if (!uploadedProofUrl) throw new Error('Foto belum tersimpan.');
          setPendingProof(null);
        } catch {
          setPendingProof({
            idTrans,
            image: proofSnapshot.image,
            filename: proofSnapshot.filename,
          });
          notify('Transaksi tercatat, namun foto gagal diunggah. Anda bisa kirim ulang.', 'warning');
        }
      }

      const trxSnapshot: LastTransactionData = {
        items: res.items || [...cart],
        total: res.total ?? summary.total,
        wo: { ...activeWO },
        metode: res.metode || payMethod,
        idTrans,
        proofUrl: uploadedProofUrl,
        tanggal: res.tanggal || new Date().toLocaleString('id-ID'),
      };

      setLastTrxData(trxSnapshot);
      setConfirmPayOpen(false);
      setReceiptOpen(true);

      // Reset cashier for next customer
      setCart([]);
      setCheckoutRequest(null);
      setActiveWO({ ...EMPTY_WO });
      setPaymentProof(null);
      setSendEmail(false);
      setEmailInput('');

      apiClient.invalidate(true);
      loadProducts(true);
      notify('Pembayaran berhasil dicatat.', 'success');
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'PRICE_CHANGED') {
        notify('Harga produk berubah di database. Harga keranjang diperbarui.', 'warning');
        try {
          const freshRes = await apiClient.call<ProductRow[]>('getProduk', { fresh: true });
          const freshList = Array.isArray(freshRes) ? freshRes : [];
          setProducts(freshList);
          setCart((prev) =>
            prev.map((item) => {
              const found = freshList.find((p) => String(p[0]) === String(item.id));
              if (!found) return item;
              const nextPrice = Number(found[3]) || 0;
              return { ...item, harga: nextPrice, subtotal: nextPrice * item.qty };
            })
          );
          setCheckoutRequest(null);
        } catch {
          // ignore
        }
      } else if (error.code !== 'STALE_SESSION') {
        notify(error.message || 'Transaksi belum dapat diproses.', 'error');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRetryProof = async () => {
    if (!pendingProof || retryingProof) return;
    setRetryingProof(true);
    try {
      const uploadRes = await apiClient.call<{ proofUrl?: string; url?: string }>('uploadBukti', {
        idTrans: pendingProof.idTrans,
        image: pendingProof.image,
        filename: pendingProof.filename,
      });
      if (!uploadRes?.proofUrl && !uploadRes?.url) {
        throw new Error('Foto belum tersimpan.');
      }
      setPendingProof(null);
      notify('Foto bukti pembayaran berhasil dikirim ulang.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim ulang foto.', 'error');
    } finally {
      setRetryingProof(false);
    }
  };

  const handleCameraCaptured = (dataUrl: string) => {
    if (cameraTarget === 'proof') {
      setPaymentProof({ image: dataUrl, filename: 'bukti.jpg' });
    } else if (cameraTarget === 'purchase') {
      setPurchaseReceiptPhoto({ image: dataUrl, filename: 'nota-pembelian.jpg' });
    } else if (cameraTarget === 'attendance') {
      setAttendanceRawPhoto(dataUrl);
    }
  };

  const cartSummary = useMemo(() => computeCartSummary(cart), [cart]);
  const currentServerToday = homeReport?.today || todayInTimezone(timezone);
  const homeDateLabel = labelTgl(currentServerToday) || currentServerToday;

  return (
    <>
      <LbmmLogoFilter />

      {!auth ? (
        <LoginScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogin={handleLogin}
          initialError={authError}
        />
      ) : (
        <AppShell
          route={parsedRoute.route}
          pageTitle={ROUTE_TITLES[parsedRoute.route]}
          homeDateLabel={homeDateLabel}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          menuOpen={menuOpen}
          onSetMenuOpen={setMenuOpen}
          pendingProof={pendingProof}
          onRetryProof={handleRetryProof}
          retryingProof={retryingProof}
          mobileCartSlot={
            parsedRoute.route === 'kasir' ? (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pointer-events-none">
                <div className="pointer-events-auto max-w-md mx-auto glass-chrome rounded-[22px] h-[58px] px-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                        {formatCount(cartSummary.totalQty)} item
                      </div>
                      <div className="text-sm font-extrabold tabular-nums truncate">
                        {rp(cartSummary.total)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('kasir-cart-panel')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }
                      className="ios-btn ios-btn-secondary min-h-[38px] px-3 text-xs"
                    >
                      Pesanan
                    </button>
                    <button
                      type="button"
                      disabled={!cart.length || checkingOut}
                      onClick={initiateCheckout}
                      className="ios-btn ios-btn-primary min-h-[38px] px-3.5 text-xs"
                    >
                      Bayar
                    </button>
                  </div>
                </div>
              </div>
            ) : undefined
          }
        >
          {parsedRoute.route === 'home' && (
            <HomeView
              report={homeReport}
              products={products}
              todayWOList={todayWOList}
              loading={loadingHome}
              onRefresh={() => {
                apiClient.invalidate(true);
                loadHomeData(true);
                loadProducts(true);
              }}
              onSelectWOForDetail={(wo) =>
                navigate(`#/daftar-wo/${encodeURIComponent(wo.idWO)}?tgl=${wo.tgl}`)
              }
            />
          )}

          {parsedRoute.route === 'wo' && (
            <WoCreateView
              todayWOList={todayWOList}
              onNotify={notify}
              onCreated={(createdWo) => {
                setActiveWO(createdWo);
                setTodayWOList((prev) => [
                  createdWo,
                  ...prev.filter((w) => w.idWO !== createdWo.idWO),
                ]);
                setCart([]);
                setCheckoutRequest(null);
                apiClient.invalidate(true);
                navigate('#/kasir');
              }}
            />
          )}

          {parsedRoute.route === 'daftar-wo' && (
            <WoListView
              date={woListDate}
              today={currentServerToday}
              rows={woListRows}
              loading={loadingWoList}
              detail={woDetail}
              detailLoading={loadingWoDetail}
              onChangeDate={(nextDate) => setWoListDate(nextDate)}
              onRefreshList={() => loadWoList(woListDate, true)}
              onOpenDetail={(idWO, tgl) =>
                navigate(`#/daftar-wo/${encodeURIComponent(idWO)}?tgl=${tgl}`)
              }
              onBackToList={() => {
                setWoDetail(null);
                navigate('#/daftar-wo');
              }}
              onOpenCashierWithWO={(wo) => {
                setActiveWO(wo);
                setCart([]);
                setCheckoutRequest(null);
                navigate('#/kasir');
              }}
              onViewReceipt={(trx) => {
                setLastTrxData(trx);
                setReceiptOpen(true);
              }}
            />
          )}

          {parsedRoute.route === 'kasir' && activeWO.idWO !== '-' && (
            <KasirView
              activeWO={activeWO}
              products={products}
              cart={cart}
              payMethod={payMethod}
              paymentProof={paymentProof}
              loadingProducts={loadingProducts}
              checkingOut={checkingOut}
              sendEmail={sendEmail}
              sendWa={sendWa}
              emailInput={emailInput}
              waInput={waInput}
              onSetPayMethod={setPayMethod}
              onAddProduct={handleAddProduct}
              onUpdateCartQty={handleUpdateCartQty}
              onRemoveCartItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onSetPaymentProof={setPaymentProof}
              onOpenCamera={() => {
                setCameraTarget('proof');
                setCameraOpen(true);
              }}
              onRefreshProducts={() => loadProducts(true)}
              onSetSendEmail={setSendEmail}
              onSetSendWa={setSendWa}
              onSetEmailInput={setEmailInput}
              onSetWaInput={setWaInput}
              onCheckout={initiateCheckout}
              onNotify={notify}
            />
          )}

          {parsedRoute.route === 'inventaris' && (
            <InventarisView
              products={products}
              topProducts={fullReport?.topProducts || homeReport?.topProducts || []}
              loading={loadingProducts}
              onRefresh={() => loadProducts(true)}
              onAddProduct={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              onEditProduct={(row) => {
                setEditingProduct(row);
                setProductModalOpen(true);
              }}
              onOpenPurchase={() => setPurchaseModalOpen(true)}
            />
          )}

          {parsedRoute.route === 'laporan' && (
            <LaporanView
              report={fullReport}
              products={products}
              loading={loadingReport}
              preset={reportPreset}
              customStart={reportStart}
              customEnd={reportEnd}
              onSelectPreset={(p) => {
                setReportPreset(p);
                if (p !== 'custom') {
                  const next = computePresetRange(p, currentServerToday);
                  setReportStart(next.start);
                  setReportEnd(next.end);
                }
              }}
              onChangeCustomRange={(start, end) => {
                setReportStart(start);
                setReportEnd(end);
              }}
              onRefresh={() => loadFullReport(reportStart, reportEnd, true)}
              onOpenExpense={() => setExpenseModalOpen(true)}
              onOpenWODetail={(wo) =>
                navigate(`#/daftar-wo/${encodeURIComponent(wo.idWO)}?tgl=${wo.tgl}`)
              }
            />
          )}

          {parsedRoute.route === 'absen' && (
            <AbsenView
              rawPhoto={attendanceRawPhoto}
              onSetRawPhoto={setAttendanceRawPhoto}
              onOpenCamera={() => {
                setCameraTarget('attendance');
                setCameraOpen(true);
              }}
              onNotify={notify}
            />
          )}
        </AppShell>
      )}

      {/* Modals */}
      <CameraModal
        open={cameraOpen}
        target={cameraTarget}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCameraCaptured}
        onNotify={notify}
      />

      <ProductModal
        open={productModalOpen}
        editingProduct={editingProduct}
        onClose={() => setProductModalOpen(false)}
        onSaved={() => loadProducts(true)}
        onNotify={notify}
      />

      <PurchaseModal
        open={purchaseModalOpen}
        products={products}
        receiptPhoto={purchaseReceiptPhoto}
        onSetReceiptPhoto={setPurchaseReceiptPhoto}
        onOpenCamera={() => {
          setCameraTarget('purchase');
          setCameraOpen(true);
        }}
        onClose={() => setPurchaseModalOpen(false)}
        onSaved={() => {
          loadProducts(true);
          if (parsedRoute.route === 'laporan') {
            loadFullReport(reportStart, reportEnd, true);
          }
        }}
        onNotify={notify}
      />

      <ExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSaved={() => loadFullReport(reportStart, reportEnd, true)}
        onNotify={notify}
      />

      <PaymentConfirmModal
        open={confirmPayOpen}
        customer={activeWO.nama}
        woId={activeWO.idWO}
        total={cartSummary.total}
        method={payMethod}
        hasProof={Boolean(paymentProof)}
        processing={checkingOut}
        onClose={() => setConfirmPayOpen(false)}
        onConfirm={executeCheckout}
      />

      <ReceiptModal
        open={receiptOpen}
        data={lastTrxData}
        profile={profile}
        defaultWaPhone={sendWa ? waInput : ''}
        onClose={() => setReceiptOpen(false)}
        onNotify={notify}
      />

      {/* iOS Liquid Glass Floating Toast Pill */}
      {toast && (
        <div
          id="toast"
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 bottom-20 lg:bottom-6 z-[60] max-w-[92vw] sm:max-w-md px-4 py-2.5 rounded-full glass-chrome text-xs md:text-sm font-semibold shadow-[var(--shadow-md)] flex items-center gap-2 ${
            toast.type === 'error'
              ? 'text-[var(--danger)] border-[var(--accent-border)]'
              : toast.type === 'warning'
              ? 'text-[var(--warning)] border-[var(--warning-bright)]/40'
              : 'text-[var(--text)]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'error'
                ? 'bg-[var(--primary)]'
                : toast.type === 'warning'
                ? 'bg-[var(--warning-bright)]'
                : 'bg-[var(--success-bright)]'
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
