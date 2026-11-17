import type { AuthState, CartItem, PendingProof, WorkOrder } from '../types/lbmm';

export const EMPTY_WO: WorkOrder = {
  idWO: '-',
  tgl: '-',
  nama: '-',
  nopol: '-',
  motor: '-',
  keluhan: '-',
  penerima: '-',
};

export interface SessionAppState {
  CART: CartItem[];
  activeWO: WorkOrder;
  checkoutRequest: string | null;
}

export interface FormRequestsState {
  wo: string | null;
  purchase: string | null;
  expense: string | null;
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadAuth(): AuthState | null {
  const auth = readStored<AuthState | null>('lbmm_auth', null);
  if (auth && auth.token && auth.expiresAt > Date.now()) {
    return auth;
  }
  return null;
}

export function loadSessionState(): SessionAppState {
  const state = readStored<Partial<SessionAppState>>('lbmm_state', {});
  return {
    CART: Array.isArray(state.CART) ? state.CART : [],
    activeWO:
      state.activeWO && state.activeWO.idWO ? state.activeWO : { ...EMPTY_WO },
    checkoutRequest: state.checkoutRequest || null,
  };
}

export function loadPendingProof(): PendingProof | null {
  return readStored<PendingProof | null>('lbmm_pending_proof', null);
}

export function newRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ||
    'request-' + Date.now() + '-' + Math.random().toString(16).slice(2)
  );
}

export function getOrCreateFormRequest(
  key: keyof FormRequestsState,
  fresh = false
): string {
  const current = readStored<FormRequestsState>('lbmm_form_requests', {
    wo: null,
    purchase: null,
    expense: null,
  });
  if (fresh || !current[key]) {
    current[key] = newRequestId();
    writeStored('lbmm_form_requests', current);
  }
  return current[key] as string;
}

export function clearFormRequest(key: keyof FormRequestsState): void {
  const current = readStored<FormRequestsState>('lbmm_form_requests', {
    wo: null,
    purchase: null,
    expense: null,
  });
  current[key] = null;
  writeStored('lbmm_form_requests', current);
}
