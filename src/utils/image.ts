export function compressImage(
  source: CanvasImageSource,
  width: number,
  height: number
): string {
  if (!width || !height) throw new Error('Foto belum siap.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(width, height));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kanvas gambar tidak tersedia.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let data = canvas.toDataURL('image/jpeg', quality);
  while (data.length > 2400000 && quality > 0.35) {
    quality -= 0.1;
    data = canvas.toDataURL('image/jpeg', quality);
  }
  if (data.length > 2400000) throw new Error('Foto terlalu besar.');
  return data;
}

export function readEvidenceFile(file: File | undefined | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      !file ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      reject(new Error('Pilih foto JPG, PNG, atau WebP maksimal 5 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const image = new Image();
        image.src = String(reader.result);
        await image.decode();
        resolve(
          compressImage(
            image,
            image.naturalWidth || image.width,
            image.naturalHeight || image.height
          )
        );
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
}

export async function readProofFile(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 20 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return compressImage(image, image.naturalWidth, image.naturalHeight);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Foto tidak dapat dibaca.'
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createWatermarkedAttendanceImage(params: {
  source: string;
  groupLabel: string;
  staff: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Foto tidak dapat dibuka.'));
    img.src = params.source;
  });

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  canvas.width = Math.max(640, Math.round(img.width * scale));
  const photoHeight = Math.round((img.height * canvas.width) / img.width);
  const font = Math.max(18, Math.round(canvas.width / 36));
  const lineHeight = Math.round(font * 1.5);
  const footer = lineHeight * 5;
  canvas.height = photoHeight + footer;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas watermark tidak tersedia.');

  ctx.drawImage(img, 0, 0, canvas.width, photoHeight);
  ctx.fillStyle = '#102b46';
  ctx.fillRect(0, photoHeight, canvas.width, footer);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${font}px sans-serif`;

  const lines = [
    `LBMM • ${params.groupLabel} • ${params.staff}`,
    `${new Date(params.capturedAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
    })} WIB`,
    `GPS: ${params.latitude.toFixed(6)}, ${params.longitude.toFixed(6)}`,
    `Akurasi ±${Math.round(params.accuracy)} m`,
  ];

  lines.forEach((line, i) =>
    ctx.fillText(line, font, photoHeight + lineHeight * (i + 1), canvas.width - font * 2)
  );

  return canvas.toDataURL('image/jpeg', 0.85);
}
