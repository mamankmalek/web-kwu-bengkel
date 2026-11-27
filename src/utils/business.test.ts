import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCartItem,
  calcPurchaseTotal,
  calcPurchaseUnitCost,
  computeCartSummary,
  computeInventoryAnalytics,
  computePresetRange,
  extractMotorType,
  extractServiceMotorType,
  extractWoNumber,
  filterWorkOrders,
  formatManualWoId,
  formatMotorWithType,
  formatServiceNameWithMotorType,
  getNextProductId,
  getServiceBaseName,
  getUsedWoNumbers,
  isServiceCategory,
  isServiceMatchingMotorType,
  normalizeProductCategory,
  PRODUCT_CATEGORIES,
  remapCartServicesForMotorType,
  sortProductsByCategoryOrder,
  updateCartItemQty,
} from './business';
import type { ProductRow, WorkOrder } from '../types/lbmm';

const sampleProducts: ProductRow[] = [
  ['PRD001', 'Oli MPX2 0.8L', 42000, 55000, 2, 'Oli'],
  ['PRD002', 'Busi NGK CPR9EA', 18000, 28000, 0, 'Sparepart'],
  ['PRD003', 'Kampas Rem Depan', 35000, 50000, 14, 'Sparepart'],
  ['JSA001', 'Servis Ringan CVT', 0, 45000, 0, 'Jasa Servis'],
];

test('cart respects stock limits for physical items and allows unlimited Jasa Servis', () => {
  let res = addCartItem([], sampleProducts[0]);
  assert.equal(res.nextCart.length, 1);
  assert.equal(res.nextCart[0].qty, 1);

  res = addCartItem(res.nextCart, sampleProducts[0]);
  assert.equal(res.nextCart[0].qty, 2);
  assert.equal(res.nextCart[0].subtotal, 110000);

  // Exceeds stock of 2
  const blocked = addCartItem(res.nextCart, sampleProducts[0]);
  assert.ok(blocked.error);
  assert.equal(blocked.nextCart[0].qty, 2);

  // Jasa Servis has stock 0 in sheet but can be added freely
  const svc = addCartItem(res.nextCart, sampleProducts[3]);
  assert.equal(svc.error, undefined);
  assert.equal(svc.nextCart.length, 2);

  const summary = computeCartSummary(svc.nextCart);
  assert.equal(summary.total, 155000);
  assert.equal(summary.totalQty, 3);

  // Decrementing removes when qty reaches 0
  const dec = updateCartItemQty(svc.nextCart, 1, -1, sampleProducts);
  assert.equal(dec.nextCart.length, 1);
});

test('purchase total and unit cost sync bidirectionally', () => {
  assert.equal(calcPurchaseTotal('5', '42000'), '210000');
  assert.equal(calcPurchaseUnitCost('4', '100000'), '25000');
  assert.equal(calcPurchaseTotal('0', '42000'), '');
});

test('computePresetRange resolves today, week, month, and last-month ranges', () => {
  assert.deepEqual(computePresetRange('today', '2026-11-17'), {
    start: '2026-11-17',
    end: '2026-11-17',
  });
  assert.deepEqual(computePresetRange('week', '2026-11-17'), {
    start: '2026-11-11',
    end: '2026-11-17',
  });
  assert.deepEqual(computePresetRange('month', '2026-11-17'), {
    start: '2026-11-01',
    end: '2026-11-17',
  });
  assert.deepEqual(computePresetRange('last-month', '2026-11-17'), {
    start: '2026-10-01',
    end: '2026-10-31',
  });
});

test('filterWorkOrders filters by status and normalized search query', () => {
  const wos: WorkOrder[] = [
    {
      idWO: 'WO-001',
      tgl: '2026-11-17',
      nama: 'Budi Santoso',
      nopol: 'L 1234 AB',
      motor: 'Vario 150',
      keluhan: 'Ganti oli',
      penerima: 'Dila',
      status: 'Proses',
    },
    {
      idWO: 'WO-002',
      tgl: '2026-11-17',
      nama: 'Siti Aminah',
      nopol: 'L 5678 CD',
      motor: 'Beat Street',
      keluhan: 'Servis CVT',
      penerima: 'Mamad',
      status: 'Selesai',
    },
  ];
  assert.equal(filterWorkOrders(wos, 'all', '').length, 2);
  assert.equal(filterWorkOrders(wos, 'pending', '').length, 1);
  assert.equal(filterWorkOrders(wos, 'done', '').length, 1);
  assert.equal(filterWorkOrders(wos, 'all', 'l1234ab')[0].idWO, 'WO-001');
});

test('computeInventoryAnalytics aggregates stock health, categories, and valuation', () => {
  const analytics = computeInventoryAnalytics(sampleProducts);
  assert.equal(analytics.totalSku, 4);
  assert.equal(analytics.physicalSku, 3);
  assert.equal(analytics.serviceSku, 1);
  assert.equal(analytics.safeCount, 1);
  assert.equal(analytics.lowCount, 1);
  assert.equal(analytics.emptyCount, 1);
  assert.equal(analytics.totalUnits, 16);
  assert.equal(analytics.totalModalValue, 2 * 42000 + 14 * 35000);
  assert.equal(analytics.totalRetailValue, 2 * 55000 + 14 * 50000);
  assert.equal(analytics.watchlist[0].id, 'PRD002');
});

test('manual WO numbering formats 1-50 and extracts used numbers', () => {
  assert.equal(formatManualWoId(1), 'WO-001');
  assert.equal(formatManualWoId(9), 'WO-009');
  assert.equal(formatManualWoId(50), 'WO-050');
  assert.equal(extractWoNumber('WO-007'), 7);
  assert.equal(extractWoNumber('wo-50'), 50);
  assert.equal(extractWoNumber('12'), 12);
  assert.equal(extractWoNumber('WO-051'), null);
  assert.equal(extractWoNumber('WO-000'), null);

  const used = getUsedWoNumbers([
    {
      idWO: 'WO-001',
      tgl: '2026-11-19',
      nama: 'A',
      nopol: 'L 1 AA',
      motor: 'Beat',
      keluhan: '',
      penerima: 'Dila',
    },
    {
      idWO: 'WO-025',
      tgl: '2026-11-19',
      nama: 'B',
      nopol: 'L 2 BB',
      motor: 'Vario',
      keluhan: '',
      penerima: 'Kira',
    },
  ]);
  assert.deepEqual([...used].sort((a, b) => a - b), [1, 25]);
});

test('category normalization and sequential product ID generation cover all 5 ranges', () => {
  assert.deepEqual([...PRODUCT_CATEGORIES], [
    'Oli',
    'Busi',
    'Jasa Servis',
    'Sparepart',
    'Consumable Servis',
  ]);

  assert.equal(normalizeProductCategory('Consumables servis'), 'Consumable Servis');
  assert.equal(normalizeProductCategory('consumable servis'), 'Consumable Servis');
  assert.equal(normalizeProductCategory('oli'), 'Oli');
  assert.equal(normalizeProductCategory('busi'), 'Busi');
  assert.equal(normalizeProductCategory('jasa servis'), 'Jasa Servis');
  assert.equal(isServiceCategory('Jasa Servis'), true);
  assert.equal(isServiceCategory('Consumable Servis'), false);

  // Empty catalog starts each category at its range minimum
  assert.equal(getNextProductId('Oli', []), 'PRD001');
  assert.equal(getNextProductId('Busi', []), 'PRD025');
  assert.equal(getNextProductId('Sparepart', []), 'PRD050');
  assert.equal(getNextProductId('Jasa Servis', []), 'PRD100');
  assert.equal(getNextProductId('Consumable Servis', []), 'PRD150');
  assert.equal(getNextProductId('Consumables servis', []), 'PRD150');

  // Continues sequentially from highest ID inside each range
  const existing: ProductRow[] = [
    ['PRD001', 'Oli A', 40000, 55000, 5, 'Oli'],
    ['PRD004', 'Oli B', 45000, 60000, 3, 'Oli'],
    ['PRD025', 'Busi A', 18000, 28000, 10, 'Busi'],
    ['PRD052', 'Kampas', 30000, 45000, 8, 'Sparepart'],
    ['JSA001', 'Servis Legacy', 0, 35000, 0, 'Jasa Servis'],
    ['PRD101', 'Servis CVT', 0, 50000, 0, 'Jasa Servis'],
    ['PRD150', 'Carb Cleaner', 20000, 30000, 4, 'Consumables servis'],
    ['PRD151', 'Brake Cleaner', 22000, 32000, 0, 'Consumable Servis'],
  ];

  assert.equal(getNextProductId('Oli', existing), 'PRD005');
  assert.equal(getNextProductId('Busi', existing), 'PRD026');
  assert.equal(getNextProductId('Sparepart', existing), 'PRD053');
  assert.equal(getNextProductId('Jasa Servis', existing), 'PRD102');
  assert.equal(getNextProductId('Consumable Servis', existing), 'PRD152');

  // Ceiling + gap reuse + full range check
  const almostFullOli: ProductRow[] = Array.from({ length: 24 }, (_, idx) => {
    const n = idx + 1;
    return [
      `PRD${String(n).padStart(3, '0')}`,
      `Oli ${n}`,
      40000,
      55000,
      1,
      'Oli',
    ] as ProductRow;
  }).filter((row) => row[0] !== 'PRD010');
  assert.equal(getNextProductId('Oli', almostFullOli), 'PRD010');

  const fullOli: ProductRow[] = Array.from({ length: 24 }, (_, idx) => [
    `PRD${String(idx + 1).padStart(3, '0')}`,
    `Oli ${idx + 1}`,
    40000,
    55000,
    1,
    'Oli',
  ]);
  assert.equal(getNextProductId('Oli', fullOli), null);

  // Consumable Servis behaves as physical stocked product in analytics & cart
  const analytics = computeInventoryAnalytics(existing);
  const consumableCat = analytics.categories.find((c) => c.name === 'Consumable Servis');
  assert.ok(consumableCat);
  assert.equal(consumableCat.skuCount, 2);
  assert.equal(consumableCat.totalUnits, 4);

  const outOfStockConsumable = addCartItem([], existing[7]);
  assert.ok(outOfStockConsumable.error);
});

test('motor type formatting, Jasa Servis matching, and cart remapping handle Matic/Bebek vs Kopling', () => {
  assert.equal(formatMotorWithType('Vario 150', 'Matic/Bebek'), 'Vario 150 (Matic/Bebek)');
  assert.equal(
    formatMotorWithType('CB150R (Matic/Bebek)', 'Kopling'),
    'CB150R (Kopling)'
  );
  assert.equal(
    extractMotorType({ motor: 'CB150R (Kopling)', tipeMotor: undefined }),
    'Kopling'
  );
  assert.equal(
    extractMotorType({ motor: 'Beat', tipeMotor: 'Matic/Bebek' }),
    'Matic/Bebek'
  );

  assert.equal(
    formatServiceNameWithMotorType('Servis Ringan', 'Kopling'),
    'Servis Ringan (Kopling)'
  );
  assert.equal(
    formatServiceNameWithMotorType('Servis Ringan (Kopling)', 'Matic/Bebek'),
    'Servis Ringan (Matic/Bebek)'
  );
  assert.equal(
    formatServiceNameWithMotorType('Servis Ringan (Kopling)', 'Umum'),
    'Servis Ringan'
  );
  assert.equal(getServiceBaseName('Servis Ringan (Kopling)'), 'Servis Ringan');
  assert.equal(extractServiceMotorType('Servis Ringan (Kopling)'), 'Kopling');
  assert.equal(extractServiceMotorType('Servis Ringan (Matic/Bebek)'), 'Matic/Bebek');
  assert.equal(extractServiceMotorType('Tambal Ban'), 'Umum');

  const catalog: ProductRow[] = [
    ['PRD001', 'Oli MPX2', 42000, 55000, 5, 'Oli'],
    ['PRD100', 'Servis Ringan (Matic/Bebek)', 0, 45000, 0, 'Jasa Servis'],
    ['PRD101', 'Servis Ringan (Kopling)', 0, 60000, 0, 'Jasa Servis'],
    ['PRD102', 'Tambal Ban', 0, 20000, 0, 'Jasa Servis'],
  ];

  // Matic/Bebek sees Matic/Bebek + Umum + physical items, hides Kopling
  assert.equal(isServiceMatchingMotorType(catalog[0], 'Matic/Bebek'), true);
  assert.equal(isServiceMatchingMotorType(catalog[1], 'Matic/Bebek'), true);
  assert.equal(isServiceMatchingMotorType(catalog[2], 'Matic/Bebek'), false);
  assert.equal(isServiceMatchingMotorType(catalog[3], 'Matic/Bebek'), true);

  // Kopling sees Kopling + Umum + physical items, hides Matic/Bebek
  assert.equal(isServiceMatchingMotorType(catalog[1], 'Kopling'), false);
  assert.equal(isServiceMatchingMotorType(catalog[2], 'Kopling'), true);
  assert.equal(isServiceMatchingMotorType(catalog[3], 'Kopling'), true);

  // Remapping cart when switching from Matic/Bebek -> Kopling swaps PRD100 -> PRD101
  const initialCart = [
    { id: 'PRD001', nama: 'Oli MPX2', harga: 55000, qty: 1, subtotal: 55000 },
    { id: 'PRD100', nama: 'Servis Ringan (Matic/Bebek)', harga: 45000, qty: 1, subtotal: 45000 },
    { id: 'PRD102', nama: 'Tambal Ban', harga: 20000, qty: 1, subtotal: 20000 },
  ];
  const remapped = remapCartServicesForMotorType(initialCart, catalog, 'Kopling');
  assert.equal(remapped.swappedCount, 1);
  assert.equal(remapped.unmatchedCount, 0);
  assert.equal(remapped.nextCart[1].id, 'PRD101');
  assert.equal(remapped.nextCart[1].harga, 60000);
  assert.equal(remapped.nextCart[2].id, 'PRD102');
});

test('sortProductsByCategoryOrder and analytics sort Oli -> Busi -> Jasa Servis -> Sparepart -> Consumable Servis', () => {
  const unsorted: ProductRow[] = [
    ['PRD150', 'Carb Cleaner', 20000, 32000, 5, 'Consumables servis'],
    ['PRD051', 'Kampas Rem', 35000, 50000, 8, 'Sparepart'],
    ['PRD100', 'Servis Ringan (Matic/Bebek)', 0, 45000, 0, 'Jasa Servis'],
    ['PRD025', 'Busi NGK', 18000, 28000, 12, 'Busi'],
    ['PRD002', 'Oli SPX2', 50000, 65000, 4, 'Oli'],
    ['PRD001', 'Oli MPX2', 42000, 55000, 10, 'Oli'],
  ];

  const sorted = sortProductsByCategoryOrder(unsorted);
  assert.deepEqual(
    sorted.map((r) => r[0]),
    ['PRD001', 'PRD002', 'PRD025', 'PRD100', 'PRD051', 'PRD150']
  );

  const analytics = computeInventoryAnalytics(unsorted);
  assert.deepEqual(
    analytics.categories.map((c) => c.name),
    ['Oli', 'Busi', 'Jasa Servis', 'Sparepart', 'Consumable Servis']
  );
});

