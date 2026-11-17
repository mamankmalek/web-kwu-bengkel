import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  axisMoney,
  buildReportCSV,
  csvCell,
  getProductPhoto,
  normalizeWhatsAppPhone,
  rp,
  safeExternalHttpsUrl,
  validDay,
} from './format';
import type { ReportData } from '../types/lbmm';

test('rp formats Indonesian Rupiah without decimals', () => {
  assert.equal(rp(0), 'Rp 0');
  assert.equal(rp(45000), 'Rp 45.000');
  assert.equal(rp(1250000), 'Rp 1.250.000');
});

test('axisMoney abbreviates thousands and millions', () => {
  assert.equal(axisMoney(500), '500');
  assert.equal(axisMoney(150000), '150 rb');
  assert.equal(axisMoney(2500000), '2,5 jt');
  assert.equal(axisMoney(-2000), '-2 rb');
});

test('validDay and addDays handle calendar boundaries accurately', () => {
  assert.equal(validDay('2026-11-17'), true);
  assert.equal(validDay('2026-02-29'), false);
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(validDay('bad-date'), false);
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('getProductPhoto converts Google Drive URLs and blocks unsafe schemes', () => {
  assert.equal(
    getProductPhoto('https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing'),
    'https://lh3.googleusercontent.com/d/1AbCdEfGhIjK'
  );
  assert.equal(
    getProductPhoto('https://drive.google.com/open?id=XYZ_123&resourcekey=rk-9'),
    'https://lh3.googleusercontent.com/d/XYZ_123?resourcekey=rk-9'
  );
  assert.equal(getProductPhoto('http://insecure.example.com/a.jpg'), '');
  assert.equal(getProductPhoto('https://user:pass@example.com/a.jpg'), '');
  assert.equal(safeExternalHttpsUrl('javascript:alert(1)'), '');
});

test('normalizeWhatsAppPhone converts local Indonesian numbers to 62 format', () => {
  assert.equal(normalizeWhatsAppPhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsAppPhone('81234567890'), '6281234567890');
  assert.equal(normalizeWhatsAppPhone('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizeWhatsAppPhone('12345'), null);
});

test('csvCell prevents spreadsheet formula injection', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  assert.equal(csvCell('+cmd'), '"\'+cmd"');
  assert.equal(csvCell(15000), '"15000"');
});

test('buildReportCSV generates BOM-prefixed CSV with summary and daily rows', () => {
  const sample: ReportData = {
    version: 2,
    today: '2026-11-17',
    range: { start: '2026-11-01', end: '2026-11-17' },
    summary: {
      revenue: 500000,
      grossProfit: 200000,
      costOfGoods: 300000,
      transactions: 4,
      itemsSold: 7,
      avgTransaction: 125000,
      purchases: 100000,
      purchaseCount: 1,
      operatingExpenses: 25000,
      netProfit: 175000,
      cash: 300000,
      qris: 200000,
      previousRevenue: 400000,
      estimatedCostItems: 0,
    },
    daily: [
      {
        date: '2026-11-17',
        revenue: 500000,
        grossProfit: 200000,
        purchases: 100000,
        expenses: 25000,
        transactions: 4,
      },
    ],
    transactions: [],
    topProducts: [],
    purchases: [],
    expenses: [],
    stock: { value: 1000000, retailValue: 1500000, productCount: 10, low: [] },
    workOrders: { pendingAll: 2, completed: 4, total: 6 },
  };
  const csv = buildReportCSV(sample);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Omzet","500000"'));
  assert.ok(csv.includes('"2026-11-17","500000","200000","100000","25000","4"'));
});
