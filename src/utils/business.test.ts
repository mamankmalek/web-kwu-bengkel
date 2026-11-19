import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCartItem,
  calcPurchaseTotal,
  calcPurchaseUnitCost,
  computeCartSummary,
  computeInventoryAnalytics,
  computePresetRange,
  extractWoNumber,
  filterWorkOrders,
  formatManualWoId,
  getUsedWoNumbers,
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

