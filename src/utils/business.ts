import type {
  CartItem,
  InventoryStatusFilter,
  MotorType,
  ProductRow,
  ReportData,
  ReportPreset,
  WorkOrder,
  WoFilterStatus,
} from '../types/lbmm';
import { addDays, validDay } from './format';

export const PRODUCT_CATEGORIES = [
  'Oli',
  'Busi',
  'Jasa Servis',
  'Sparepart',
  'Consumable Servis',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PHYSICAL_PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'Oli',
  'Busi',
  'Sparepart',
  'Consumable Servis',
];

export const PRODUCT_ID_RANGES: Record<ProductCategory, { min: number; max: number }> = {
  Oli: { min: 1, max: 24 },
  Busi: { min: 25, max: 49 },
  Sparepart: { min: 50, max: 99 },
  'Jasa Servis': { min: 100, max: 149 },
  'Consumable Servis': { min: 150, max: 199 },
};

export function normalizeProductCategory(raw: unknown): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 'Lainnya';
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (lower === 'oli') return 'Oli';
  if (lower === 'busi') return 'Busi';
  if (lower === 'sparepart' || lower === 'spare part' || lower === 'spareparts') {
    return 'Sparepart';
  }
  if (lower === 'jasa servis' || lower === 'jasa') return 'Jasa Servis';
  if (lower === 'consumable servis' || lower === 'consumables servis') {
    return 'Consumable Servis';
  }
  return trimmed;
}

export function isServiceCategory(raw: unknown): boolean {
  return normalizeProductCategory(raw) === 'Jasa Servis';
}

export function getCategorySortIndex(raw: unknown): number {
  const normalized = normalizeProductCategory(raw) as ProductCategory;
  const idx = PRODUCT_CATEGORIES.indexOf(normalized);
  return idx === -1 ? PRODUCT_CATEGORIES.length : idx;
}

export function sortProductsByCategoryOrder(products: ProductRow[]): ProductRow[] {
  return [...products].sort((a, b) => {
    const catDiff = getCategorySortIndex(a[5]) - getCategorySortIndex(b[5]);
    if (catDiff !== 0) return catDiff;
    const catNameDiff = normalizeProductCategory(a[5]).localeCompare(
      normalizeProductCategory(b[5]),
      'id-ID'
    );
    if (catNameDiff !== 0) return catNameDiff;

    const idA = extractProductIdNumber(a[0]);
    const idB = extractProductIdNumber(b[0]);
    if (idA !== null && idB !== null && idA !== idB) return idA - idB;
    if (idA !== null && idB === null) return -1;
    if (idA === null && idB !== null) return 1;
    return String(a[0] || '').localeCompare(String(b[0] || ''), 'id-ID');
  });
}

export function formatProductId(num: number): string {
  return `PRD${String(Math.max(1, Math.trunc(num))).padStart(3, '0')}`;
}

export function extractProductIdNumber(id: unknown): number | null {
  const match = String(id ?? '')
    .trim()
    .toUpperCase()
    .match(/^PRD0*(\d+)$/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export function getProductIdRange(category: unknown): { min: number; max: number } | null {
  const normalized = normalizeProductCategory(category) as ProductCategory;
  return PRODUCT_ID_RANGES[normalized] ?? null;
}

export function getNextProductId(category: unknown, products: ProductRow[]): string | null {
  const range = getProductIdRange(category);
  if (!range) return null;

  const usedInRange = new Set<number>();
  let maxUsed = range.min - 1;

  for (const row of products) {
    const num = extractProductIdNumber(row[0]);
    if (num !== null && num >= range.min && num <= range.max) {
      usedInRange.add(num);
      if (num > maxUsed) maxUsed = num;
    }
  }

  if (maxUsed + 1 <= range.max) {
    return formatProductId(maxUsed + 1);
  }

  for (let candidate = range.min; candidate <= range.max; candidate++) {
    if (!usedInRange.has(candidate)) {
      return formatProductId(candidate);
    }
  }

  return null;
}

export const MOTOR_TYPES: readonly MotorType[] = ['Matic/Bebek', 'Kopling'];

export function normalizeMotorType(raw: unknown): MotorType | null {
  const clean = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!clean) return null;
  if (/\bkopling\b/.test(clean) || /\bsport\b/.test(clean)) return 'Kopling';
  if (/\bmatic\b/.test(clean) || /\bbebek\b/.test(clean)) return 'Matic/Bebek';
  return null;
}

export function extractMotorType(
  source: Pick<WorkOrder, 'motor' | 'tipeMotor'> | string | null | undefined
): MotorType | null {
  if (!source) return null;
  if (typeof source === 'string') return normalizeMotorType(source);
  return normalizeMotorType(source.tipeMotor) || normalizeMotorType(source.motor);
}

export function stripMotorTypeTag(raw: unknown): string {
  return String(raw ?? '')
    .replace(/\s*\((?:matic\/bebek|matic|bebek|kopling)\)\s*$/i, '')
    .trim();
}

export function formatMotorWithType(motor: string, tipeMotor: MotorType): string {
  const base = stripMotorTypeTag(motor);
  if (!base) return `(${tipeMotor})`;
  return `${base} (${tipeMotor})`;
}

export function extractServiceMotorType(productName: unknown): MotorType | 'Umum' {
  return normalizeMotorType(productName) || 'Umum';
}

export function getServiceBaseName(productName: unknown): string {
  return stripMotorTypeTag(productName);
}

export function formatServiceNameWithMotorType(
  name: string,
  motorType: MotorType | 'Umum'
): string {
  const base = stripMotorTypeTag(name);
  if (!base) return '';
  if (motorType === 'Umum') return base;
  return `${base} (${motorType})`;
}

export function isServiceMatchingMotorType(
  product: ProductRow,
  motorType: MotorType | null
): boolean {
  if (!isServiceCategory(product[5]) || !motorType) return true;
  const svcType = extractServiceMotorType(product[1]);
  return svcType === 'Umum' || svcType === motorType;
}

export function remapCartServicesForMotorType(
  cart: CartItem[],
  products: ProductRow[],
  nextMotorType: MotorType
): { nextCart: CartItem[]; swappedCount: number; unmatchedCount: number } {
  let swappedCount = 0;
  let unmatchedCount = 0;

  const nextCart = cart.map((item) => {
    const currentProd = products.find((p) => String(p[0]) === String(item.id));
    const isSvc = currentProd
      ? isServiceCategory(currentProd[5])
      : extractServiceMotorType(item.nama) !== 'Umum';
    if (!isSvc) return item;

    const currentSvcType = extractServiceMotorType(item.nama);
    if (currentSvcType === 'Umum' || currentSvcType === nextMotorType) return item;

    const baseName = getServiceBaseName(item.nama).toLowerCase();
    const counterpart = products.find(
      (p) =>
        isServiceCategory(p[5]) &&
        extractServiceMotorType(p[1]) === nextMotorType &&
        getServiceBaseName(p[1]).toLowerCase() === baseName
    );
    if (!counterpart) {
      unmatchedCount++;
      return item;
    }

    const nextPrice = Number(counterpart[3]) || 0;
    swappedCount++;
    return {
      ...item,
      id: String(counterpart[0]),
      nama: String(counterpart[1]),
      harga: nextPrice,
      subtotal: nextPrice * item.qty,
    };
  });

  return { nextCart, swappedCount, unmatchedCount };
}

export function addCartItem(
  cart: CartItem[],
  product: ProductRow
): { nextCart: CartItem[]; error?: string } {
  const [id, nama, , rawPrice, rawStock, category] = product;
  const price = Number(rawPrice) || 0;
  const stock = Number(rawStock) || 0;
  const existing = cart.find((item) => String(item.id) === String(id));

  if (!isServiceCategory(category) && (existing?.qty || 0) >= stock) {
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
  if (isServiceCategory(product[5])) return 'service';
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
    const category = normalizeProductCategory(row[5]);
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
    categories: [...categoryMap.values()].sort(
      (a, b) =>
        getCategorySortIndex(a.name) - getCategorySortIndex(b.name) ||
        b.skuCount - a.skuCount ||
        a.name.localeCompare(b.name, 'id-ID')
    ),
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

