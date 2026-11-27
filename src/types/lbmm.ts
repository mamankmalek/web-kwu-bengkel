export type RouteKey =
  | 'home'
  | 'wo'
  | 'daftar-wo'
  | 'kasir'
  | 'inventaris'
  | 'laporan'
  | 'absen';

export type ThemeMode = 'light' | 'dark';
export type ViewMode = 'grid' | 'list';
export type WoFilterStatus = 'all' | 'pending' | 'done';
export type InventoryStatusFilter = 'all' | 'safe' | 'low' | 'empty' | 'service';
export type ReportPreset = 'month' | 'today' | 'week' | 'last-month' | 'custom';
export type MotorType = 'Matic/Bebek' | 'Kopling';

/** [id, nama, modal, jual, stok, kategori, gambar] */
export type ProductRow = [
  string,
  string,
  number,
  number,
  number,
  string,
  string?
];

export interface AuthState {
  token: string;
  expiresAt: number;
}

export interface ShopProfile {
  nama: string;
  alamat: string;
  hp: string;
}

export interface WorkOrder {
  idWO: string;
  tgl: string;
  jam?: string;
  nama: string;
  nopol: string;
  motor: string;
  tipeMotor?: MotorType | string;
  keluhan: string;
  penerima: string;
  status?: string;
  total?: number | null;
}

export interface CartItem {
  id: string;
  nama: string;
  harga: number;
  qty: number;
  subtotal: number;
}

export interface ProofPayload {
  image: string;
  filename: string;
}

export interface PendingProof extends ProofPayload {
  idTrans: string;
}

export interface TransactionRecord {
  idTrans: string;
  waktu: string;
  total: number;
  metode: string;
  proofUrl?: string;
}

export interface WorkOrderDetailResponse {
  wo: WorkOrder;
  transaksi?: TransactionRecord | null;
  items?: CartItem[];
}

export interface LastTransactionData {
  items: CartItem[];
  total: number;
  wo: WorkOrder;
  metode: string;
  idTrans: string;
  proofUrl: string;
  tanggal?: string;
  waPhone?: string;
}

export interface ReportSummary {
  revenue: number;
  grossProfit: number;
  costOfGoods: number;
  transactions: number;
  itemsSold: number;
  avgTransaction: number;
  purchases: number;
  purchaseCount: number;
  operatingExpenses: number;
  netProfit: number;
  cash: number;
  qris: number;
  previousRevenue: number;
  revenueChange?: number | null;
  estimatedCostItems: number;
  unknownCostTransactions?: number;
}

export interface DailyReportRow {
  date: string;
  revenue: number;
  grossProfit: number;
  purchases: number;
  expenses: number;
  transactions: number;
}

export interface ReportTransactionRow {
  id?: string;
  date: string;
  time?: string;
  woId?: string;
  woDate?: string;
  customer?: string;
  method?: string;
  total: number;
  grossProfit: number;
  costIncomplete?: boolean;
  proofUrl?: string;
}

export interface TopProductRow {
  id: string;
  name: string;
  category?: string;
  qty: number;
  revenue: number;
  grossProfit: number;
}

export interface PurchaseRow {
  date: string;
  product: string;
  qty: number;
  total: number;
  supplier?: string;
  staff?: string;
  method?: string;
  receiptUrl?: string;
  purchaseType?: string;
  unitCost: number;
  salePrice?: number | null;
  productSource?: string;
}

export interface ExpenseRow {
  date: string;
  category?: string;
  note?: string;
  amount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
}

export interface ReportData {
  version: number;
  mode?: string;
  today: string;
  timezone?: string;
  range: {
    start: string;
    end: string;
  };
  summary: ReportSummary;
  daily: DailyReportRow[];
  transactions: ReportTransactionRow[];
  topProducts: TopProductRow[];
  purchases: PurchaseRow[];
  expenses: ExpenseRow[];
  stock: {
    value: number;
    retailValue: number;
    productCount: number;
    low: LowStockItem[];
    lowTotal?: number;
  };
  workOrders: {
    pendingAll: number;
    completed: number;
    total: number;
  };
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error';
}

export type CameraTarget = 'proof' | 'attendance' | 'purchase';
