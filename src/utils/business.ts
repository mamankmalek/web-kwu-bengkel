import type {
  CartItem,
  InventoryStatusFilter,
  ProductRow,
  ReportData,
  ReportPreset,
  WorkOrder,
  WoFilterStatus,
} from '../types/lbmm';
import { addDays, validDay } from './format';

export function addCartItem(
  cart: CartItem[],
  product: ProductRow
): { nextCart: CartItem[]; error?: string } {
  const [id, nama, , rawPrice, rawStock, category] = product;
  const price = Number(rawPrice) || 0;
  const stock = Number(rawStock) || 0;
  const existing = cart.find((item) => String(item.id) === String(id));

  if (category !== 'Jasa Servis' && (existing?.qty || 0) >= stock) {
    return { nextCart: cart, error: 'Jumlah melebihi stok yang tersedia.' };
  }

  if (existing) {
    const nextCart = cart.map((item) =>
      String(item.id) === String(id)
        ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.harga }
        : item
    );
    return { nextCart };
  }

  return {
    nextCart: [
      ...cart,
      { id: String(id), nama: String(nama), harga: price, qty: 1, subtotal: price },
    ],
  };
}

export function updateCartItemQty(
  cart: CartItem[],
  index: number,
  delta: number,
  products: ProductRow[]
): { nextCart: CartItem[]; error?: string } {
  const target = cart[index];
  if (!target) return { nextCart: cart };

  if (delta > 0) {
    const prod = products.find((row) => String(row[0]) === String(target.id));
    if (!prod) return { nextCart: cart };
    return addCartItem(cart, prod);
  }

  const nextQty = target.qty + delta;
  if (nextQty <= 0) {
    return { nextCart: cart.filter((_, i) => i !== index) };
  }

  return {
    nextCart: cart.map((item, i) =>
      i === index ? { ...item, qty: nextQty, subtotal: nextQty * item.harga } : item
    ),
  };
}

export function computeCartSummary(cart: CartItem[]): { total: number; totalQty: number } {
  return cart.reduce(
    (acc, item) => ({
      total: acc.total + Number(item.subtotal || 0),
      totalQty: acc.totalQty + Number(item.qty || 0),
    }),
    { total: 0, totalQty: 0 }
  );
}

export function calcPurchaseTotal(qtyValue: string, costValue: string): string {
  const qty = Number(qtyValue);
  const cost = Number(costValue);
  if (costValue !== '' && qty > 0 && Number.isFinite(cost) && cost >= 0) {
    return String(Math.round(qty * cost));
  }
  return '';
}

export function calcPurchaseUnitCost(qtyValue: string, totalValue: string): string {
  const qty = Number(qtyValue);
  const total = Number(totalValue);
  if (totalValue !== '' && qty > 0 && Number.isFinite(total) && total >= 0) {
    return String(total / qty);
  }
  return '';
}

export function computePresetRange(
  preset: Exclude<ReportPreset, 'custom'>,
  serverToday: string
): { start: string; end: string } {
  let end = serverToday;
  let start = end.slice(0, 7) + '-01';

  if (preset === 'today') {
    start = end;
  } else if (preset === 'week') {
    start = addDays(end, -6);
  } else if (preset === 'last-month') {
    end = addDays(end.slice(0, 7) + '-01', -1);
    start = end.slice(0, 7) + '-01';
  }
  return { start, end };
}

export function filterWorkOrders(
  rows: WorkOrder[],
  filter: WoFilterStatus,
  query: string
): WorkOrder[] {
  const normalize = (v: unknown) =>
    String(v ?? '')
      .toLocaleLowerCase('id-ID')
      .replace(/\s+/g, '');
  const term = normalize(query);

  return rows.filter((w) => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'done' ? w.status === 'Selesai' : w.status !== 'Selesai');
    if (!matchesStatus) return false;
    if (!term) return true;
    return [w.idWO, w.nama, w.nopol, w.motor, w.keluhan, w.penerima].some((v) =>
      normalize(v).includes(term)
    );
  });
}

export function getProductStatus(product: ProductRow): Exclude<InventoryStatusFilter, 'all'> {
  const stock = Number(product[4]) || 0;
  if (product[5] === 'Jasa Servis') return 'service';
  if (stock <= 0) return 'empty';
  if (stock <= 5) return 'low';
  return 'safe';
}

export interface InventoryAnalytics {
  totalSku: number;
  physicalSku: number;
  serviceSku: number;
  safeCount: number;
  lowCount: number;
  emptyCount: number;
  totalUnits: number;
  totalModalValue: number;
  totalRetailValue: number;
  potentialMargin: number;
  categories: {
    name: string;
    skuCount: number;
    totalUnits: number;
    modalValue: number;
    retailValue: number;
    lowOrEmpty: number;
  }[];
  watchlist: {
    id: string;
    name: string;
    category: string;
    stock: number;
    status: Exclude<InventoryStatusFilter, 'all'>;
    modal: number;
    jual: number;
  }[];
}

export function computeInventoryAnalytics(products: ProductRow[]): InventoryAnalytics {
  let safeCount = 0;
  let lowCount = 0;
  let emptyCount = 0;
  let serviceSku = 0;
  let totalUnits = 0;
  let totalModalValue = 0;
  let totalRetailValue = 0;

  const categoryMap = new Map<
    string,
    {
      name: string;
      skuCount: number;
      totalUnits: number;
      modalValue: number;
      retailValue: number;
      lowOrEmpty: number;
    }
  >();

  const watchlist: InventoryAnalytics['watchlist'] = [];

  for (const row of products) {
    const id = String(row[0] || '');
    const name = String(row[1] || '');
    const modal = Number(row[2]) || 0;
    const jual = Number(row[3]) || 0;
    const stock = Number(row[4]) || 0;
    const category = String(row[5] || 'Lainnya');
    const status = getProductStatus(row);

    if (status === 'service') serviceSku++;
    else if (status === 'empty') emptyCount++;
    else if (status === 'low') lowCount++;
    else safeCount++;

    if (status !== 'service') {
      totalUnits += Math.max(0, stock);
      totalModalValue += Math.max(0, stock) * modal;
      totalRetailValue += Math.max(0, stock) * jual;
      watchlist.push({ id, name, category, stock, status, modal, jual });
    }

    const catEntry = categoryMap.get(category) || {
      name: category,
      skuCount: 0,
      totalUnits: 0,
      modalValue: 0,
      retailValue: 0,
      lowOrEmpty: 0,
    };
    catEntry.skuCount++;
    if (status !== 'service') {
      catEntry.totalUnits += Math.max(0, stock);
      catEntry.modalValue += Math.max(0, stock) * modal;
      catEntry.retailValue += Math.max(0, stock) * jual;
      if (status === 'low' || status === 'empty') catEntry.lowOrEmpty++;
    }
    categoryMap.set(category, catEntry);
  }

  watchlist.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'id-ID'));

  return {
    totalSku: products.length,
    physicalSku: products.length - serviceSku,
    serviceSku,
    safeCount,
    lowCount,
    emptyCount,
    totalUnits,
    totalModalValue,
    totalRetailValue,
    potentialMargin: Math.max(0, totalRetailValue - totalModalValue),
    categories: [...categoryMap.values()].sort((a, b) => b.skuCount - a.skuCount),
    watchlist,
  };
}

export function validateReportData(data: unknown): ReportData {
  const d = data as ReportData | null;
  const requiredNumbers = [
    'revenue',
    'grossProfit',
    'costOfGoods',
    'transactions',
    'itemsSold',
    'avgTransaction',
    'purchases',
    'purchaseCount',
    'operatingExpenses',
    'netProfit',
    'cash',
    'qris',
    'previousRevenue',
    'estimatedCostItems',
  ] as const;

  if (
    !d ||
    d.version !== 2 ||
    !validDay(d.today) ||
    !d.summary ||
    !d.range ||
    !validDay(d.range.start) ||
    !validDay(d.range.end) ||
    requiredNumbers.some((key) => !Number.isFinite(Number(d.summary[key]))) ||
    !Array.isArray(d.daily) ||
    !Array.isArray(d.transactions) ||
    !Array.isArray(d.topProducts) ||
    !Array.isArray(d.purchases) ||
    !Array.isArray(d.expenses) ||
    !d.stock ||
    !Array.isArray(d.stock.low) ||
    !d.workOrders
  ) {
    throw new Error('Laporan lengkap belum tersedia.');
  }
  return d;
}

export const MANUAL_WO_MIN = 1;
export const MANUAL_WO_MAX = 50;

export function formatManualWoId(num: number): string {
  const safe = Math.min(MANUAL_WO_MAX, Math.max(MANUAL_WO_MIN, Math.trunc(num)));
  return `WO-${String(safe).padStart(3, '0')}`;
}

export function extractWoNumber(idWO: string): number | null {
  const match = String(idWO || '')
    .trim()
    .match(/(?:^|\D)(\d+)$/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  if (!Number.isInteger(num) || num < MANUAL_WO_MIN || num > MANUAL_WO_MAX) {
    return null;
  }
  return num;
}

export function getUsedWoNumbers(rows: WorkOrder[]): Set<number> {
  const used = new Set<number>();
  for (const row of rows) {
    const num = extractWoNumber(row.idWO);
    if (num !== null) used.add(num);
  }
  return used;
}

