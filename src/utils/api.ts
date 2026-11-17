import type { AuthState } from '../types/lbmm';

export const API_URL =
  'https://script.google.com/macros/s/AKfycbxH3IdfJHIHC_0JmuX_hCbN_7-E0W48rpRHObd-lJKSzegvy7ECJtXF-gCggtSyojmaqQ/exec';

const READ_TTL: Record<string, number> = {
  getProduk: 30000,
  getProfil: 300000,
  getLaporan: 20000,
  getRingkasan: 20000,
  getWOList: 10000,
  getWODetail: 5000,
};

const WRITE_ACTIONS = new Set([
  'simpanWO',
  'tambahProduk',
  'updateProduk',
  'prosesTransaksi',
  'uploadBukti',
  'recordPurchase',
  'recordExpense',
  'recordAttendance',
]);

interface CacheEntry {
  value: unknown;
  expires: number;
}

class ApiClient {
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<unknown>>();
  private freshActions = new Set<string>();
  private generation = 0;
  private fastHome = true;
  private authGetter: () => AuthState | null = () => null;
  private onAuthExpired: (message: string) => void = () => {};
  private onTimezone: (tz: string) => void = () => {};

  configure(handlers: {
    getAuth: () => AuthState | null;
    onAuthExpired: (message: string) => void;
    onTimezone: (tz: string) => void;
  }) {
    this.authGetter = handlers.getAuth;
    this.onAuthExpired = handlers.onAuthExpired;
    this.onTimezone = handlers.onTimezone;
  }

  invalidate(force = false) {
    this.generation++;
    this.cache.clear();
    this.pending.clear();
    if (force) {
      Object.keys(READ_TTL).forEach((action) => this.freshActions.add(action));
    }
  }

  private async rawRequest(
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const auth = this.authGetter();
    const requestToken = String(payload.token ?? auth?.token ?? '');

    let response: Response;
    try {
      response = await globalThis.fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          ...payload,
          action,
          ...(action !== 'login' ? { token: requestToken } : {}),
        }),
        redirect: 'follow',
      });
    } catch {
      throw new Error('Koneksi terputus. Periksa internet, lalu coba lagi.');
    }

    if (!response.ok) {
      throw new Error('Server belum dapat dihubungi. Coba lagi.');
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new Error(
        'Respons tidak sesuai. Pastikan Google Apps Script sudah diperbarui.'
      );
    }

    const latestToken = this.authGetter()?.token ?? '';
    if (!['login', 'logout'].includes(action) && latestToken !== requestToken) {
      const err = new Error('Sesi telah berubah. Muat kembali data.') as Error & {
        code?: string;
      };
      err.code = 'STALE_SESSION';
      throw err;
    }

    if (data?.status === 'error') {
      if (data.code === 'AUTH_REQUIRED' && latestToken === requestToken) {
        this.onAuthExpired('Sesi berakhir. Masuk kembali untuk melanjutkan.');
      }
      const err = new Error(
        String(data.message || 'Data belum dapat diproses.')
      ) as Error & { code?: string };
      err.code = data.code ? String(data.code) : undefined;
      throw err;
    }

    if (typeof data?.timezone === 'string' && data.timezone) {
      this.onTimezone(data.timezone);
    }

    return data;
  }

  async call<T = unknown>(
    action: string,
    payload: Record<string, unknown> = {},
    options: { isHomeRoute?: boolean } = {}
  ): Promise<T> {
    if (
      action === 'getLaporan' &&
      this.fastHome &&
      options.isHomeRoute &&
      !payload.start &&
      !payload.end
    ) {
      try {
        return await this.dispatch<T>('getRingkasan', payload);
      } catch (error) {
        const err = error as Error & { code?: string };
        if (err.code !== 'UNKNOWN_ACTION') throw error;
        this.fastHome = false;
      }
    }
    return this.dispatch<T>(action, payload);
  }

  private async dispatch<T>(
    action: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const ttl = READ_TTL[action];
    if (!ttl) {
      try {
        const result = await this.rawRequest(action, payload);
        if (action === 'login' || action === 'logout') {
          this.invalidate(true);
        }
        return result as T;
      } finally {
        if (WRITE_ACTIONS.has(action)) {
          this.invalidate(true);
        }
      }
    }

    const token = this.authGetter()?.token || '';
    const epoch = this.generation;
    const key = `${token}|${action}|${JSON.stringify(payload)}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expires > now && !payload.fresh) {
      return cached.value as T;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    const forceFresh = Boolean(payload.fresh) || this.freshActions.has(action);
    const requestPayload = forceFresh ? { ...payload, fresh: true } : payload;

    const job = this.rawRequest(action, requestPayload).then((value) => {
      if (epoch === this.generation && token === (this.authGetter()?.token || '')) {
        this.cache.set(key, { value, expires: Date.now() + ttl });
        this.freshActions.delete(action);
      }
      return value;
    });

    this.pending.set(key, job);
    try {
      return (await job) as T;
    } finally {
      if (this.pending.get(key) === job) {
        this.pending.delete(key);
      }
    }
  }
}

export const apiClient = new ApiClient();
