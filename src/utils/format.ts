import type { ReportData } from '../types/lbmm';

const DAY_MS = 86400000;

export function rp(value: unknown): string {
  return (
    'Rp ' +
    Number(value || 0).toLocaleString('id-ID', {
      maximumFractionDigits: 0,
    })
  );
}

export function formatCount(value: unknown): string {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString('id-ID');
}

export function axisMoney(value: number): string {
  const n = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (n >= 1_000_000) {
    return sign + (n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  }
  if (n >= 1_000) {
    return sign + (n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' rb';
  }
  return sign + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function validDay(day: string | null | undefined): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return false;
  const parsed = new Date(day + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

export function todayInTimezone(timezone = 'Asia/Jakarta'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(day: string, offset: number): string {
  return new Date(new Date(day + 'T00:00:00Z').getTime() + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function labelTgl(day: string): string {
  if (!validDay(day)) return '';
  return new Date(day + 'T12:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function dateLabel(value: string, short = false): string {
  if (!validDay(value)) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: short ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));
}

export function getProductPhoto(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (['drive.google.com', 'www.drive.google.com'].includes(url.hostname)) {
      const id =
        url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1] ||
        url.searchParams.get('id');
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return '';
      const resourceKey = url.searchParams.get('resourcekey');
      return (
        'https://lh3.googleusercontent.com/d/' +
        id +
        (resourceKey ? '?resourcekey=' + encodeURIComponent(resourceKey) : '')
      );
    }
    return url.href;
  } catch {
    return '';
  }
}

export function safeExternalHttpsUrl(value: unknown): string {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

export function normalizeWhatsAppPhone(input: string): string | null {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function csvCell(value: unknown): string {
  let str = String(value == null ? '' : value);
  if (typeof value !== 'number' && /^[\s]*[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return '"' + str.replace(/"/g, '""') + '"';
}

export function buildReportCSV(data: ReportData): string {
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const unknownCosts = Math.max(
    num(data.summary.unknownCostTransactions),
    data.transactions.filter((row) => row.costIncomplete).length
  );
  const unknownDates = new Set(
    data.transactions.filter((row) => row.costIncomplete).map((row) => row.date)
  );
  if (unknownCosts && !unknownDates.size) {
    data.daily.forEach((row) => unknownDates.add(row.date));
  }

  const rows: (string | number)[][] = [
    ['Laporan servis', data.range.start, data.range.end],
    [],
    ['Ringkasan', 'Nilai'],
    ['Omzet', num(data.summary.revenue)],
    ['Modal terjual', num(data.summary.costOfGoods)],
    ['Laba kotor', unknownCosts ? 'Belum lengkap' : num(data.summary.grossProfit)],
    ['Biaya operasional', num(data.summary.operatingExpenses)],
    ['Estimasi laba bersih', unknownCosts ? 'Belum lengkap' : num(data.summary.netProfit)],
    ['Pembelian', num(data.summary.purchases)],
    ['Transaksi', num(data.summary.transactions)],
    [],
    ['Harian'],
    ['Tanggal', 'Omzet', 'Laba kotor', 'Pembelian', 'Biaya operasional', 'Transaksi'],
    ...data.daily.map((row) => [
      row.date,
      num(row.revenue),
      unknownDates.has(row.date) ? 'Belum lengkap' : num(row.grossProfit),
      num(row.purchases),
      num(row.expenses),
      num(row.transactions),
    ]),
  ];

  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
