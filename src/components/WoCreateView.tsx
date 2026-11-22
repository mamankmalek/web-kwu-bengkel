import React, { useMemo, useState } from 'react';
import { ClipboardList, Wrench } from 'lucide-react';
import type { WorkOrder } from '../types/lbmm';
import { apiClient } from '../utils/api';
import {
  formatManualWoId,
  getUsedWoNumbers,
  MANUAL_WO_MAX,
  MANUAL_WO_MIN,
} from '../utils/business';
import { clearFormRequest, getOrCreateFormRequest } from '../utils/storage';

const PENERIMA_LIST = ['Dila', 'Kira', 'Mamad', 'Febri', 'Akmal'];
const WO_NUMBERS = Array.from(
  { length: MANUAL_WO_MAX - MANUAL_WO_MIN + 1 },
  (_, i) => MANUAL_WO_MIN + i
);

export function WoCreateView({
  todayWOList = [],
  onCreated,
  onNotify,
}: {
  todayWOList?: WorkOrder[];
  onCreated: (wo: WorkOrder) => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const [nomor, setNomor] = useState('');
  const [nama, setNama] = useState('');
  const [nopol, setNopol] = useState('');
  const [motor, setMotor] = useState('');
  const [penerima, setPenerima] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const usedNumbers = useMemo(() => getUsedWoNumbers(todayWOList), [todayWOList]);

  const parsedNomor = nomor === '' ? null : Number.parseInt(nomor, 10);
  const selectedNomor =
    parsedNomor !== null &&
    Number.isInteger(parsedNomor) &&
    parsedNomor >= MANUAL_WO_MIN &&
    parsedNomor <= MANUAL_WO_MAX
      ? parsedNomor
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNomor === null) {
      onNotify('Pilih nomor Work Order (1–50) terlebih dahulu.', 'warning');
      return;
    }

    const cleanNama = nama.trim();
    const cleanNopol = nopol.trim();
    const cleanMotor = motor.trim();
    const cleanKeluhan = keluhan.trim();

    if (!cleanNama || !cleanNopol || !cleanMotor || !penerima) {
      onNotify('Lengkapi data pelanggan.', 'warning');
      return;
    }

    const formattedIdWO = formatManualWoId(selectedNomor);
    const requestId = getOrCreateFormRequest('wo');
    setSubmitting(true);
    const obj = {
      idWO: formattedIdWO,
      nomor: selectedNomor,
      nama: cleanNama,
      nopol: cleanNopol,
      motor: cleanMotor,
      keluhan: cleanKeluhan,
      penerima,
    };

    try {
      const res = await apiClient.call<{
        status?: string;
        idWO?: string;
        tgl: string;
        wo?: Partial<WorkOrder>;
      }>('simpanWO', {
        obj,
        idWO: formattedIdWO,
        nomorWO: selectedNomor,
        requestId,
      });

      clearFormRequest('wo');
      const finalIdWO = res.idWO || formattedIdWO;
      const createdWo: WorkOrder = {
        ...obj,
        ...(res.wo || {}),
        idWO: finalIdWO,
        tgl: res.tgl,
      };
      setNomor('');
      setNama('');
      setNopol('');
      setMotor('');
      setPenerima('');
      setKeluhan('');
      onNotify(`${finalIdWO} disimpan.`, 'success');
      onCreated(createdWo);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code !== 'STALE_SESSION') {
        onNotify(err.message || 'Gagal menyimpan WO.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="view-wo" className="ios-enter max-w-[760px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
          WO Baru
        </h1>
        <a href="#/daftar-wo" className="ios-btn ios-btn-secondary">
          <ClipboardList className="w-4 h-4" />
          <span>Lihat daftar</span>
        </a>
      </div>

      <section className="glass-panel p-5 md:p-6">
        <form id="wo-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Manual WO Number Dropdown (1 - 50) */}
          <div className="space-y-1.5 pb-4 border-b border-[var(--glass-border-subtle)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="wo-nomor-select"
                className="block text-xs font-semibold text-[var(--muted)]"
              >
                Nomor WO (1–50)
              </label>
              <span className="text-xs tabular-nums font-semibold">
                {selectedNomor !== null ? (
                  <span id="wo-nomor-preview" className="font-mono-code font-bold text-[var(--primary)]">
                    {formatManualWoId(selectedNomor)}
                  </span>
                ) : (
                  <span id="wo-nomor-preview" className="text-[var(--muted)]">
                    —
                  </span>
                )}
              </span>
            </div>

            <select
              id="wo-nomor-select"
              className="ios-select tabular-nums"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              required
            >
              <option value="">Pilih 1–50</option>
              {WO_NUMBERS.map((num) => {
                const isUsed = usedNumbers.has(num);
                return (
                  <option key={num} value={String(num)}>
                    {num} ({formatManualWoId(num)}
                    {isUsed ? ' · sudah ada' : ''})
                  </option>
                );
              })}
            </select>

            {selectedNomor !== null && usedNumbers.has(selectedNomor) && (
              <p className="text-[11px] font-medium text-[var(--warning)] m-0">
                {formatManualWoId(selectedNomor)} sudah ada hari ini.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="wo-nama" className="block text-xs font-semibold text-[var(--muted)]">
                Nama pelanggan
              </label>
              <input
                id="wo-nama"
                type="text"
                className="ios-input"
                placeholder="Nama pelanggan"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wo-nopol" className="block text-xs font-semibold text-[var(--muted)]">
                Nomor polisi
              </label>
              <input
                id="wo-nopol"
                type="text"
                className="ios-input font-mono-code uppercase"
                placeholder="L 1234 AB"
                value={nopol}
                onChange={(e) => setNopol(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wo-motor" className="block text-xs font-semibold text-[var(--muted)]">
                Jenis motor
              </label>
              <input
                id="wo-motor"
                type="text"
                className="ios-input"
                placeholder="Vario 150 / Beat"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wo-penerima" className="block text-xs font-semibold text-[var(--muted)]">
                Penerima servis
              </label>
              <select
                id="wo-penerima"
                className="ios-select"
                value={penerima}
                onChange={(e) => setPenerima(e.target.value)}
                required
              >
                <option value="">Pilih penerima</option>
                {PENERIMA_LIST.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wo-keluhan" className="block text-xs font-semibold text-[var(--muted)]">
              Keluhan
            </label>
            <textarea
              id="wo-keluhan"
              className="ios-textarea min-h-[108px]"
              placeholder="Catatan keluhan (opsional)"
              value={keluhan}
              onChange={(e) => setKeluhan(e.target.value)}
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:justify-end gap-2.5">
            <button
              type="submit"
              id="wo-submit"
              disabled={submitting}
              className="ios-btn ios-btn-primary w-full sm:w-auto min-w-[200px]"
            >
              <Wrench className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan & buka kasir'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
