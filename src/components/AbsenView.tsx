import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Upload, UserCheck } from 'lucide-react';
import { apiClient } from '../utils/api';
import { createWatermarkedAttendanceImage, readEvidenceFile } from '../utils/image';
import { newRequestId } from '../utils/storage';
import { StatusChip } from './LiquidPrimitives';

export const ATTENDANCE_GROUPS: Record<
  'staff' | 'fungsio',
  { label: string; names: string[] }
> = {
  staff: { label: 'Staf KWU', names: ['Dila', 'Kira', 'Mamad', 'Febri', 'Akmal'] },
  fungsio: { label: 'Fungsio KWU', names: ['Radhit', 'Vanza', 'Meuthia', 'Kevin', 'Jawahir'] },
};

export interface AttendanceEvidence {
  image: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  requestId: string;
}

export function AbsenView({
  rawPhoto,
  onSetRawPhoto,
  onOpenCamera,
  onNotify,
}: {
  rawPhoto: string;
  onSetRawPhoto: (dataUrl: string) => void;
  onOpenCamera: () => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}) {
  const [group, setGroup] = useState<'staff' | 'fungsio'>('staff');
  const [staff, setStaff] = useState(ATTENDANCE_GROUPS.staff.names[0]);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState<AttendanceEvidence | null>(null);

  const names = useMemo(() => ATTENDANCE_GROUPS[group].names, [group]);

  const handleGroupChange = (nextGroup: 'staff' | 'fungsio') => {
    setGroup(nextGroup);
    setStaff(ATTENDANCE_GROUPS[nextGroup].names[0]);
    setEvidence(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readEvidenceFile(file);
      onSetRawPhoto(dataUrl);
      setEvidence(null);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membaca foto.', 'warning');
    }
  };

  const handlePrepareLocation = () => {
    if (!rawPhoto) {
      onNotify('Ambil atau pilih foto absen terlebih dahulu.', 'warning');
      return;
    }
    if (!navigator.geolocation) {
      onNotify('Browser tidak mendukung geolokasi.', 'error');
      return;
    }

    setPreparing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const capturedAt = new Date().toISOString();
          const watermarked = await createWatermarkedAttendanceImage({
            source: rawPhoto,
            groupLabel: ATTENDANCE_GROUPS[group].label,
            staff,
            capturedAt,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setEvidence({
            image: watermarked,
            capturedAt,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            requestId: newRequestId(),
          });
          onNotify('Foto & lokasi GPS siap disimpan.', 'success');
        } catch (err) {
          onNotify(err instanceof Error ? err.message : 'Gagal menyiapkan foto.', 'error');
        } finally {
          setPreparing(false);
        }
      },
      (geoErr) => {
        setPreparing(false);
        onNotify(
          geoErr.code === 1
            ? 'Izin lokasi ditolak. Aktifkan GPS untuk absen.'
            : 'Lokasi belum dapat terbaca. Coba lagi.',
          'warning'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!evidence) {
      onNotify('Klik "Siapkan foto & lokasi" terlebih dahulu.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.call('recordAttendance', {
        group,
        staff,
        capturedAt: evidence.capturedAt,
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        accuracy: evidence.accuracy,
        image: evidence.image,
        requestId: evidence.requestId,
      });
      onNotify(`Absen ${staff} berhasil dicatat.`, 'success');
      onSetRawPhoto('');
      setEvidence(null);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== 'STALE_SESSION') {
        onNotify(error.message || 'Gagal mencatat absen.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="view-absen" className="ios-enter max-w-[780px] mx-auto space-y-4">
      <div>
        <h1 className="text-[1.45rem] md:text-[1.75rem] font-extrabold tracking-tight m-0">
          Absen KWU
        </h1>
        <p className="text-xs md:text-sm text-[var(--muted)] m-0 mt-0.5">
          Kehadiran staf & fungsio dengan foto berpenanda waktu dan koordinat GPS
        </p>
      </div>

      <section className="glass-panel p-5 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="absen-group" className="block text-xs font-semibold text-[var(--muted)]">
              Kelompok
            </label>
            <select
              id="absen-group"
              className="ios-select"
              value={group}
              onChange={(e) => handleGroupChange(e.target.value as 'staff' | 'fungsio')}
            >
              <option value="staff">{ATTENDANCE_GROUPS.staff.label}</option>
              <option value="fungsio">{ATTENDANCE_GROUPS.fungsio.label}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="absen-staff" className="block text-xs font-semibold text-[var(--muted)]">
              Nama
            </label>
            <select
              id="absen-staff"
              className="ios-select"
              value={staff}
              onChange={(e) => {
                setStaff(e.target.value);
                setEvidence(null);
              }}
            >
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenCamera}
            className="ios-btn ios-btn-secondary flex-1 min-w-[140px]"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil foto</span>
          </button>

          <label className="ios-btn ios-btn-secondary flex-1 min-w-[140px] cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Pilih file</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {(evidence?.image || rawPhoto) && (
          <div className="rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/5">
            <img
              src={evidence?.image || rawPhoto}
              alt="Pratinjau foto absen"
              className="w-full max-h-[360px] object-contain mx-auto"
            />
          </div>
        )}

        {evidence && (
          <div className="p-3.5 rounded-2xl bg-[var(--success-soft)] border border-[var(--success)]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[var(--success)]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                GPS: {evidence.latitude.toFixed(6)}, {evidence.longitude.toFixed(6)} (±
                {Math.round(evidence.accuracy)} m)
              </span>
            </div>
            <StatusChip status="success" label="Watermark siap" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            disabled={!rawPhoto || preparing}
            onClick={handlePrepareLocation}
            className="ios-btn ios-btn-secondary w-full"
          >
            <MapPin className="w-4 h-4" />
            <span>{preparing ? 'Membaca GPS...' : 'Siapkan foto & lokasi'}</span>
          </button>

          <button
            type="button"
            disabled={!evidence || submitting}
            onClick={handleSubmit}
            className="ios-btn ios-btn-primary w-full"
          >
            <UserCheck className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan...' : 'Simpan absen'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
