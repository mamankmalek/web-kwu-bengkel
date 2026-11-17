import type { CartItem, WorkOrder } from '../types/lbmm';

export const RECEIPT_EXPORT_LOGO_DATA_URL =
  'data:image/png;base64,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';

const MM_TO_PT = 72 / 25.4;
const WIDTH = 80;
const MARGIN = 4;
const MAX_HEIGHT = 280;
const SCALE = 8;
const FONT = 'Arial, "DejaVu Sans", sans-serif';
const encoder = new TextEncoder();

export interface ReceiptPrepareInput {
  shop: { name: string; address: string; phone: string };
  id: string;
  date: string;
  wo: WorkOrder;
  items: CartItem[];
  total: number;
  method: string;
}

interface TextOp {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
  align: CanvasTextAlign;
  color: string;
}
interface RuleOp {
  kind: 'rule';
  y: number;
}
interface ImageOp {
  kind: 'image';
  image: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}
type DrawOp = TextOp | RuleOp | ImageOp;
interface LayoutBlock {
  height: number;
  ops: DrawOp[];
}

export interface PreparedReceipt {
  id: string;
  shopName: string;
  pdf: { blob: Blob; name: string };
  photos: { blob: Blob; name: string }[];
  pages: number;
  maxPageHeightMM: number;
}

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();

const money = (value: unknown) =>
  'Rp ' + Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

function setFont(ctx: CanvasRenderingContext2D, size: number, bold = false) {
  ctx.font = `${bold ? '700 ' : '400 '}${size * SCALE}px ${FONT}`;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  value: unknown,
  width: number,
  size = 2.8,
  bold = false
): string[] {
  setFont(ctx, size, bold);
  const lines: string[] = [];
  for (const paragraph of clean(value).split(/\r?\n/)) {
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= width * SCALE) {
        current = candidate;
        continue;
      }
      if (current) {
        lines.push(current);
        current = '';
      }
      if (ctx.measureText(word).width <= width * SCALE) {
        current = word;
        continue;
      }
      for (const ch of Array.from(word)) {
        if (current && ctx.measureText(current + ch).width > width * SCALE) {
          lines.push(current);
          current = '';
        }
        current += ch;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [''];
}

function textOp(
  text: string,
  x: number,
  y: number,
  size = 2.8,
  bold = false,
  align: CanvasTextAlign = 'left',
  color = '#171717'
): TextOp {
  return { kind: 'text', text, x, y, size, bold, align, color };
}

function rule(): LayoutBlock {
  return { height: 3, ops: [{ kind: 'rule', y: 1.2 }] };
}

function centered(
  ctx: CanvasRenderingContext2D,
  value: unknown,
  size = 2.8,
  bold = false
): LayoutBlock {
  const lines = wrap(ctx, value, WIDTH - 2 * MARGIN, size, bold);
  const leading = size * 1.42;
  return {
    height: lines.length * leading,
    ops: lines.map((line, i) =>
      textOp(line, WIDTH / 2, i * leading, size, bold, 'center')
    ),
  };
}

function buildHeader(
  ctx: CanvasRenderingContext2D,
  data: ReceiptPrepareInput,
  logo: HTMLCanvasElement | null,
  continued: boolean
): LayoutBlock {
  const ops: DrawOp[] = [];
  let y = 0;
  if (logo && !continued) {
    const w = 34;
    const h = (w * logo.height) / logo.width;
    ops.push({ kind: 'image', image: logo, x: (WIDTH - w) / 2, y, w, h });
    y += h + 2;
  }
  const blocks = [
    centered(ctx, data.shop.name, 3.8, true),
    ...(!continued && data.shop.address ? [centered(ctx, data.shop.address, 2.55)] : []),
    ...(!continued && data.shop.phone ? [centered(ctx, data.shop.phone, 2.55)] : []),
    centered(
      ctx,
      continued ? 'NOTA PEMBAYARAN (LANJUTAN)' : 'NOTA PEMBAYARAN',
      2.6,
      true
    ),
    centered(ctx, continued ? data.id : data.date, 2.5),
  ];
  for (const block of blocks) {
    block.ops.forEach((op) => ops.push({ ...op, y: op.y + y }));
    y += block.height + 1;
  }
  ops.push({ kind: 'rule', y: y + 1 });
  return { height: y + 4, ops };
}

function metadataBlocks(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string
): LayoutBlock[] {
  const lines = wrap(ctx, value || '-', 49, 2.7);
  const result: LayoutBlock[] = [];
  for (let start = 0; start < lines.length; start += 14) {
    const chunk = lines.slice(start, start + 14);
    const ops: DrawOp[] = chunk.map((line, i) => textOp(line, 27, i * 3.9, 2.7));
    ops.unshift(textOp(start ? '' : label, MARGIN, 0, 2.7, false, 'left', '#555555'));
    result.push({ height: chunk.length * 3.9 + 1, ops });
  }
  return result;
}

function itemBlocks(
  ctx: CanvasRenderingContext2D,
  item: { name: string; qty: number; price: number; subtotal: number }
): LayoutBlock[] {
  const names = wrap(ctx, item.name, WIDTH - 2 * MARGIN, 2.95, true);
  const out: LayoutBlock[] = [];
  for (let start = 0; start < names.length; start += 16) {
    const chunk = names.slice(start, start + 16);
    const ops: DrawOp[] = chunk.map((line, i) =>
      textOp(line, MARGIN, i * 4.15, 2.95, true)
    );
    let y = chunk.length * 4.15;
    if (start + chunk.length === names.length) {
      const left = `${item.qty.toLocaleString('id-ID')} x ${money(item.price)}`;
      const right = money(item.subtotal);
      setFont(ctx, 2.7);
      const rightWidth = ctx.measureText(right).width / SCALE;
      const leftWidth = ctx.measureText(left).width / SCALE;
      if (leftWidth + rightWidth + 3 <= WIDTH - 2 * MARGIN) {
        ops.push(
          textOp(left, MARGIN, y, 2.7),
          textOp(right, WIDTH - MARGIN, y, 2.7, false, 'right')
        );
        y += 3.9;
      } else {
        const a = wrap(ctx, left, WIDTH - 2 * MARGIN, 2.7);
        const b = wrap(ctx, right, WIDTH - 2 * MARGIN, 2.7);
        a.forEach((line) => {
          ops.push(textOp(line, MARGIN, y, 2.7));
          y += 3.9;
        });
        b.forEach((line) => {
          ops.push(textOp(line, WIDTH - MARGIN, y, 2.7, false, 'right'));
          y += 3.9;
        });
      }
    }
    out.push({ height: y + 2.8, ops });
  }
  return out;
}

async function loadReceiptLogo(): Promise<HTMLCanvasElement | null> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(new Error('Logo timeout')), 2000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Logo error'));
      };
      img.src = RECEIPT_EXPORT_LOGO_DATA_URL;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = pixels.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i];
      const g = p[i + 1];
      const b = p[i + 2];
      p[i] = r - 0.89 * g - 0.89 * b;
      p[i + 1] = 0.23 * r - 0.12 * g - 0.12 * b;
      p[i + 2] = 0.19 * r - 0.07 * g - 0.07 * b;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

function paintOps(ctx: CanvasRenderingContext2D, ops: DrawOp[], offset: number) {
  for (const op of ops) {
    if (op.kind === 'text') {
      setFont(ctx, op.size, op.bold);
      ctx.fillStyle = op.color;
      ctx.textAlign = op.align;
      ctx.textBaseline = 'top';
      ctx.fillText(op.text, op.x * SCALE, (offset + op.y) * SCALE);
    } else if (op.kind === 'rule') {
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 0.13 * SCALE;
      ctx.setLineDash([1.1 * SCALE, 0.8 * SCALE]);
      ctx.beginPath();
      ctx.moveTo(MARGIN * SCALE, (offset + op.y) * SCALE);
      ctx.lineTo((WIDTH - MARGIN) * SCALE, (offset + op.y) * SCALE);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (op.kind === 'image') {
      ctx.drawImage(
        op.image,
        op.x * SCALE,
        (offset + op.y) * SCALE,
        op.w * SCALE,
        op.h * SCALE
      );
    }
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Foto nota belum dapat dibuat.'))),
      'image/png'
    )
  );
}

function canvasToJpegBytes(canvas: HTMLCanvasElement): Uint8Array {
  const binary = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function buildPdfBlob(
  images: { width: number; height: number; jpeg: Uint8Array }[]
): Blob {
  const chunks: BlobPart[] = [];
  const offsets = [0];
  let length = 0;

  const put = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes as unknown as BlobPart);
    length += bytes.byteLength;
  };
  const writeObj = (id: number, body: string) => {
    offsets[id] = length;
    put(`${id} 0 obj\n${body}\nendobj\n`);
  };

  put('%PDF-1.4\n');
  put(new Uint8Array([37, 226, 227, 207, 211, 10]));
  writeObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  writeObj(
    2,
    `<< /Type /Pages /Count ${images.length} /Kids [${images
      .map((_, i) => `${3 + i * 3} 0 R`)
      .join(' ')}] >>`
  );

  images.forEach((image, i) => {
    const page = 3 + i * 3;
    const content = page + 1;
    const img = page + 2;
    const w = (WIDTH * MM_TO_PT).toFixed(5);
    const h = ((image.height / SCALE) * MM_TO_PT).toFixed(5);

    writeObj(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Receipt ${img} 0 R >> >> /Contents ${content} 0 R >>`
    );
    const commands = `q\n${w} 0 0 ${h} 0 0 cm\n/Receipt Do\nQ\n`;
    writeObj(
      content,
      `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`
    );
    offsets[img] = length;
    put(
      `${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`
    );
    put(image.jpeg);
    put('\nendstream\nendobj\n');
  });

  const start = length;
  const count = images.length * 3 + 3;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) {
    put(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}

function receiptBasename(id: string): string {
  const normalized = id
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return 'Nota_LBMM_' + (normalized || 'transaksi');
}

export async function prepareReceiptExport(
  raw: ReceiptPrepareInput
): Promise<PreparedReceipt> {
  if (!Array.isArray(raw.items) || !raw.items.length) {
    throw new Error('Rincian nota belum tersedia.');
  }
  const items = raw.items.map((item) => ({
    name: clean(item.nama) || 'Item',
    qty: Number(item.qty),
    price: Number(item.harga),
    subtotal: Number(item.subtotal),
  }));
  if (
    items.some(
      (i) =>
        ![i.qty, i.price, i.subtotal].every(Number.isFinite) ||
        i.qty < 0 ||
        i.price < 0 ||
        i.subtotal < 0
    ) ||
    !Number.isFinite(Number(raw.total)) ||
    Number(raw.total) < 0
  ) {
    throw new Error('Nominal nota tidak valid.');
  }

  const data: ReceiptPrepareInput = {
    ...raw,
    shop: {
      name: clean(raw.shop.name) || 'LBMM',
      address: clean(raw.shop.address),
      phone: clean(raw.shop.phone),
    },
    id: clean(raw.id) || '-',
    date: clean(raw.date) || '-',
    method: clean(raw.method) || '-',
    total: Number(raw.total),
  };

  const logo = await loadReceiptLogo();
  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) throw new Error('Kanvas tidak tersedia.');

  const blocks: LayoutBlock[] = [];
  const meta: [string, string][] = [
    ['Transaksi', data.id],
    ['WO', clean(data.wo.idWO)],
    ['Nama', clean(data.wo.nama)],
    ['No. polisi', clean(data.wo.nopol)],
    ['Motor', clean(data.wo.motor)],
    ['Penerima', clean(data.wo.penerima)],
    ['Metode', data.method],
    ...(clean(data.wo.keluhan) ? [['Keluhan', clean(data.wo.keluhan)] as [string, string]] : []),
  ];
  meta.forEach(([label, value]) => blocks.push(...metadataBlocks(measureCtx, label, value)));
  blocks.push(rule());
  items.forEach((item) => blocks.push(...itemBlocks(measureCtx, item)));
  blocks.push(rule());

  setFont(measureCtx, 4, true);
  const totalStr = money(data.total);
  if (measureCtx.measureText(totalStr).width / SCALE < WIDTH - 2 * MARGIN - 20) {
    blocks.push({
      height: 7,
      ops: [
        textOp('TOTAL', MARGIN, 0, 3.3, true),
        textOp(totalStr, WIDTH - MARGIN, 0, 4, true, 'right'),
      ],
    });
  } else {
    blocks.push(centered(measureCtx, 'TOTAL', 3, true), centered(measureCtx, totalStr, 3.7, true));
  }
  blocks.push(rule(), centered(measureCtx, 'Terima kasih.', 2.8));

  const pages: { header: LayoutBlock; blocks: LayoutBlock[]; used: number; height: number }[] = [];
  const newPage = () => {
    const h = buildHeader(measureCtx, data, logo, pages.length > 0);
    const p = { header: h, blocks: [] as LayoutBlock[], used: 0, height: 0 };
    pages.push(p);
    return p;
  };
  let currentPage = newPage();
  for (const block of blocks) {
    const available = MAX_HEIGHT - 2 * MARGIN - currentPage.header.height - 6;
    if (currentPage.used + block.height > available && currentPage.blocks.length) {
      currentPage = newPage();
    }
    currentPage.blocks.push(block);
    currentPage.used += block.height;
  }
  pages.forEach((p) => {
    p.height =
      Math.ceil(
        (MARGIN * 2 + p.header.height + p.used + (pages.length > 1 ? 6 : 1)) * SCALE
      ) / SCALE;
  });

  const base = receiptBasename(data.id);
  const images: { width: number; height: number; jpeg: Uint8Array }[] = [];
  const photos: { blob: Blob; name: string }[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * SCALE;
    canvas.height = Math.round(page.height * SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kanvas nota gagal dibuat.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    paintOps(ctx, page.header.ops, MARGIN);
    let y = MARGIN + page.header.height;
    for (const block of page.blocks) {
      paintOps(ctx, block.ops, y);
      y += block.height;
    }
    if (pages.length > 1) {
      paintOps(
        ctx,
        [textOp(`Halaman ${i + 1}/${pages.length}`, WIDTH / 2, 0, 2.4, false, 'center', '#555555')],
        y + 2
      );
    }
    const png = await canvasToPngBlob(canvas);
    images.push({ width: canvas.width, height: canvas.height, jpeg: canvasToJpegBytes(canvas) });
    photos.push({
      blob: png,
      name: `${base}${pages.length > 1 ? '_' + String(i + 1).padStart(2, '0') : ''}.png`,
    });
    canvas.width = 1;
    canvas.height = 1;
  }

  return {
    id: data.id,
    shopName: data.shop.name,
    pdf: { blob: buildPdfBlob(images), name: `${base}.pdf` },
    photos,
    pages: pages.length,
    maxPageHeightMM: Math.max(...pages.map((p) => p.height)),
  };
}

export function triggerFileDownload(files: { blob: Blob; name: string }[]): void {
  for (const file of files) {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
