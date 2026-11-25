import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileDown,
  Gauge,
  Loader2,
  UserCheck,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  VehicleDriver,
  VehicleLoanRequest,
  VehicleLoanStatus,
  VehicleUnit,
} from '../../types';
import {
  calculateTimeDurationLabel,
  SavePerintahJalanInput,
} from '../../hooks/useVehicleManagement';

interface PerintahJalanModalProps {
  open: boolean;
  onClose: () => void;
  loan: VehicleLoanRequest | null;
  vehicles: VehicleUnit[];
  drivers: VehicleDriver[];
  onSave: (loan: VehicleLoanRequest, input: SavePerintahJalanInput) => Promise<void>;
}

const PerintahJalanModal: React.FC<PerintahJalanModalProps> = ({
  open,
  onClose,
  loan,
  vehicles,
  drivers,
  onSave,
}) => {
  const [tanggal, setTanggal] = useState('');
  const [driverId, setDriverId] = useState<string>('');
  const [driverNama, setDriverNama] = useState('');
  const [berangkatJam, setBerangkatJam] = useState('08:00');
  const [kembaliJam, setKembaliJam] = useState('16:00');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [kendaraanNoPol, setKendaraanNoPol] = useState('');
  const [kendaraanNama, setKendaraanNama] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [standKmAwal, setStandKmAwal] = useState<number>(0);
  const [standKmAkhir, setStandKmAkhir] = useState<number>(0);
  const [targetStatus, setTargetStatus] = useState<VehicleLoanStatus>('Perintah Jalan Terbit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !loan) return;
    setError(null);

    const pj = loan.perintahJalan;
    setTanggal(pj?.tanggal || loan.tanggalDipergunakan || new Date().toISOString().slice(0, 10));
    setDriverId(pj?.driverId || '');
    setDriverNama(pj?.driverNama || '');
    setBerangkatJam(pj?.berangkatJam || loan.jamMulai || '08:00');
    setKembaliJam(pj?.kembaliJam || loan.jamSelesai || '16:00');
    setVehicleId(pj?.vehicleId || '');
    setKendaraanNoPol(pj?.kendaraanNoPol || '');
    setKendaraanNama(pj?.kendaraanNama || '');
    setKeperluan(pj?.keperluan || loan.keperluan || '');
    setStandKmAwal(pj?.standKmAwal ?? 0);
    setStandKmAkhir(pj?.standKmAkhir ?? 0);

    if (
      loan.status === 'Perintah Jalan Terbit' ||
      loan.status === 'Sedang Berpergian' ||
      loan.status === 'Selesai'
    ) {
      setTargetStatus(loan.status);
    } else {
      setTargetStatus('Perintah Jalan Terbit');
    }
  }, [open, loan?.id]);

  const lamaDipergunakan = useMemo(() => {
    if (!berangkatJam) return '-';
    if (!kembaliJam) return 'Menunggu jam kembali';
    return calculateTimeDurationLabel(berangkatJam, kembaliJam);
  }, [berangkatJam, kembaliJam]);

  const jarakTempuh = useMemo(() => {
    const awal = Number(standKmAwal) || 0;
    const akhir = Number(standKmAkhir) || 0;
    return akhir >= awal ? akhir - awal : 0;
  }, [standKmAwal, standKmAkhir]);

  const handleSelectDriver = (selectedId: string) => {
    setDriverId(selectedId);
    if (selectedId && selectedId !== '__custom__') {
      const found = drivers.find((d) => d.id === selectedId);
      if (found) {
        setDriverNama(found.namaDriver);
      }
    } else if (selectedId === '') {
      setDriverNama('');
    }
  };

  const handleSelectVehicle = (selectedId: string) => {
    setVehicleId(selectedId);
    if (selectedId && selectedId !== '__custom__') {
      const found = vehicles.find((v) => v.id === selectedId);
      if (found) {
        setKendaraanNoPol(found.noPol);
        setKendaraanNama(found.namaKendaraan);
        if (!standKmAwal || standKmAwal === 0) {
          setStandKmAwal(found.kmTerakhir || 0);
          if (!standKmAkhir || standKmAkhir < (found.kmTerakhir || 0)) {
            setStandKmAkhir(found.kmTerakhir || 0);
          }
        }
      }
    } else if (selectedId === '') {
      setKendaraanNoPol('');
      setKendaraanNama('');
    }
  };

  const handleDownloadPdf = () => {
    if (!loan) return;
    const docPdf = new jsPDF();

    docPdf.setFillColor(23, 59, 101);
    docPdf.rect(0, 0, 210, 28, 'F');
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(13);
    docPdf.text('PT PLN NUSANTARA POWER - UP KAPUAS', 14, 12);
    docPdf.setFontSize(10);
    docPdf.text('SURAT PEMINJAMAN & PERINTAH JALAN KENDARAAN DINAS', 14, 19);
    docPdf.setFontSize(9);
    docPdf.text(`Nomor: ${loan.loanNumber}`, 152, 19);

    docPdf.setTextColor(23, 59, 101);
    docPdf.setFontSize(10);
    docPdf.text('I. DATA PENGAJUAN PEMINJAMAN KENDARAAN DINAS', 14, 38);

    (docPdf as any).autoTable({
      startY: 41,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [0, 114, 188] },
      body: [
        ['Nama', loan.nama, 'Jumlah Penumpang', `${loan.jumlahPenumpang} Orang`],
        ['Pemohon', `${loan.pemohonNama} (${loan.pemohonNip || '-'})`, 'Bidang', loan.bidang],
        ['Tujuan', loan.tujuan, 'Tanggal Dipergunakan', loan.tanggalDipergunakan],
        ['Jam Mulai - Selesai', `${loan.jamMulai} - ${loan.jamSelesai}`, 'Durasi', loan.durasiJam],
        ['Keperluan', loan.keperluan, 'Status', targetStatus],
        [
          'Atasan Langsung',
          loan.atasanLangsungNama,
          'Menyetujui Asman Business Support',
          loan.asmanBisnisSupportNama,
        ],
      ],
    });

    const nextY = ((docPdf as any).lastAutoTable?.finalY || 105) + 8;
    docPdf.setFontSize(10);
    docPdf.text('II. PERINTAH JALAN (DIISI OLEH PIC ADMINISTRASI KENDARAAN)', 14, nextY);

    (docPdf as any).autoTable({
      startY: nextY + 3,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      body: [
        ['Tanggal Perintah Jalan', tanggal || '-', 'Pengemudi / Driver', driverNama || '-'],
        [
          'Kendaraan / No Pol',
          `${kendaraanNoPol || '-'} (${kendaraanNama || '-'})`,
          'Keperluan',
          keperluan || '-',
        ],
        [
          'Berangkat (Jam)',
          berangkatJam || '-',
          'Kembali (Jam)',
          kembaliJam || '-',
        ],
        [
          'Lama Dipergunakan',
          lamaDipergunakan,
          'Jarak Yang Ditempuh',
          `${jarakTempuh.toLocaleString('id-ID')} km`,
        ],
        [
          'Stand KM Awal',
          `${Number(standKmAwal || 0).toLocaleString('id-ID')} km`,
          'Stand KM Akhir',
          `${Number(standKmAkhir || 0).toLocaleString('id-ID')} km`,
        ],
      ],
    });

    const sigY = ((docPdf as any).lastAutoTable?.finalY || 175) + 14;
    docPdf.setFontSize(8.5);
    docPdf.text('Pemohon,', 20, sigY);
    docPdf.text('Atasan Langsung,', 75, sigY);
    docPdf.text('Asman Business Support,', 132, sigY);

    docPdf.text(loan.pemohonNama || '-', 20, sigY + 20);
    docPdf.text(loan.atasanLangsungNama || '-', 75, sigY + 20);
    docPdf.text(loan.asmanBisnisSupportNama || '-', 132, sigY + 20);

    docPdf.text('PIC Administrasi Kendaraan,', 20, sigY + 32);
    docPdf.text('Pengemudi / Driver,', 115, sigY + 32);
    docPdf.text(loan.perintahJalan?.picNama || 'Admin Kendaraan UP Kapuas', 20, sigY + 50);
    docPdf.text(driverNama || '-', 115, sigY + 50);

    docPdf.save(`Perintah_Jalan_${loan.loanNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    setError(null);

    if (!tanggal) return setError('Tanggal Perintah Jalan wajib diisi.');
    if (!driverNama.trim()) return setError('Pengemudi / Driver wajib dipilih atau diisi.');
    if (!berangkatJam) return setError('Jam Berangkat wajib diisi.');
    if (!kendaraanNoPol.trim() || !kendaraanNama.trim()) {
      return setError('Kendaraan dan Nomor Polisi wajib dipilih atau diisi.');
    }
    if (!keperluan.trim()) return setError('Keperluan wajib diisi.');
    if (standKmAkhir > 0 && standKmAkhir < standKmAwal) {
      return setError('Stand KM Akhir tidak boleh lebih kecil dari Stand KM Awal.');
    }

    setSubmitting(true);
    try {
      await onSave(loan, {
        tanggal,
        driverId: driverId && driverId !== '__custom__' ? driverId : null,
        driverNama,
        berangkatJam,
        kembaliJam,
        vehicleId: vehicleId && vehicleId !== '__custom__' ? vehicleId : null,
        kendaraanNoPol,
        kendaraanNama,
        keperluan,
        standKmAwal: Number(standKmAwal) || 0,
        standKmAkhir: Number(standKmAkhir) || 0,
        targetStatus,
      });
      onClose();
    } catch (err: any) {
      const rawMsg = err?.message || 'Gagal menyimpan Perintah Jalan.';
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed && typeof parsed === 'object' && parsed.error) {
          const emailInfo = parsed.authInfo?.email ? ` (Akun: ${parsed.authInfo.email})` : '';
          const roleMatch = String(parsed.error).match(/\(role:\s*([^)]+)\)/i);
          const roleInfo = roleMatch ? ` [Role: ${roleMatch[1]}]` : '';
          const pathInfo = parsed.path ? ` [Path: ${parsed.operationType || 'update'} ${parsed.path}]` : '';
          if (String(parsed.error).toLowerCase().includes('permission')) {
            setError(
              `Akses penyimpanan Perintah Jalan ditolak oleh aturan keamanan Firestore${emailInfo}${roleInfo}${pathInfo}. Pastikan akun Anda memiliki peran Admin / Super Admin yang aktif dan muat ulang halaman.`
            );
          } else {
            setError(`${parsed.error}${emailInfo}${roleInfo}${pathInfo}`);
          }
          return;
        }
      } catch {
        // Fallback to raw message
      }
      setError(rawMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !loan) return null;

  const isCustomVehicle = vehicleId === '__custom__' || vehicles.length === 0;
  const isCustomDriver = driverId === '__custom__' || drivers.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perintah-jalan-modal-title"
    >
      <div className="bg-white dark:bg-[#0E1A2E] w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173B65] via-[#0072BC] to-[#009CE0] px-6 py-5 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <ClipboardCheck size={21} className="text-[#F9D423]" />
              </div>
              <div>
                <h2
                  id="perintah-jalan-modal-title"
                  className="text-lg font-extrabold tracking-tight"
                >
                  PERINTAH JALAN ({loan.loanNumber})
                </h2>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Diisi oleh PIC Administrasi Kendaraan · Pemohon: {loan.pemohonNama} · Tujuan:{' '}
                  {loan.tujuan}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Tutup Modal Perintah Jalan"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {/* Ringkasan Pengajuan */}
          <div className="p-3.5 rounded-2xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Nama / Pemohon</p>
              <p className="font-bold text-[#173B65] dark:text-white truncate">{loan.pemohonNama}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Penumpang</p>
              <p className="font-bold text-[#173B65] dark:text-white">{loan.jumlahPenumpang} Orang</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Rencana Jam</p>
              <p className="font-bold text-[#173B65] dark:text-white">
                {loan.jamMulai} – {loan.jamSelesai}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Bidang</p>
              <p className="font-bold text-[#0072BC] dark:text-[#72C8F1] truncate">{loan.bidang}</p>
            </div>
          </div>

          {/* Row 1: Tanggal & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Status Perjalanan
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as VehicleLoanStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                <option value="Perintah Jalan Terbit">Perintah Jalan Terbit (Siap Berangkat)</option>
                <option value="Sedang Berpergian">Sedang Berpergian (On Trip / Tracking)</option>
                <option value="Selesai">Selesai (Kembali ke Pool)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Pengemudi / Driver & Kendaraan / No Pol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 p-3.5 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#173B65] dark:text-slate-200">
                <UserCheck size={14} className="text-[#0072BC]" />
                Pengemudi / Driver <span className="text-red-500">*</span>
              </label>
              {drivers.length > 0 && (
                <select
                  value={driverId}
                  onChange={(e) => handleSelectDriver(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                >
                  <option value="">-- Pilih dari Data Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.namaDriver} ({d.status} · {d.unitKerja})
                    </option>
                  ))}
                  <option value="__custom__">+ Input Manual Nama Driver</option>
                </select>
              )}
              {(isCustomDriver || !driverId) && (
                <input
                  type="text"
                  value={driverNama}
                  onChange={(e) => setDriverNama(e.target.value)}
                  placeholder="Nama Pengemudi / Driver..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
              )}
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#173B65] dark:text-slate-200">
                <Car size={14} className="text-[#0072BC]" />
                Kendaraan / No Pol <span className="text-red-500">*</span>
              </label>
              {vehicles.length > 0 && (
                <select
                  value={vehicleId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                >
                  <option value="">-- Pilih dari Data Kendaraan --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.noPol} — {v.namaKendaraan} ({v.status}, Kap. {v.kapasitasPenumpang} org)
                    </option>
                  ))}
                  <option value="__custom__">+ Input Manual Kendaraan / No Pol</option>
                </select>
              )}
              {(isCustomVehicle || !vehicleId) && (
                <div className="grid grid-cols-5 gap-2">
                  <input
                    type="text"
                    value={kendaraanNoPol}
                    onChange={(e) => setKendaraanNoPol(e.target.value.toUpperCase())}
                    placeholder="No Pol (KB 1234 XX)"
                    className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                  />
                  <input
                    type="text"
                    value={kendaraanNama}
                    onChange={(e) => setKendaraanNama(e.target.value)}
                    placeholder="Nama / Tipe Kendaraan"
                    className="col-span-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Berangkat (Jam), Kembali (Jam), Lama dipergunakan */}
          <div className="p-4 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Berangkat (Jam) <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={berangkatJam}
                onChange={(e) => setBerangkatJam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Kembali (Jam)
              </label>
              <input
                type="time"
                value={kembaliJam}
                onChange={(e) => setKembaliJam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 flex items-center gap-2.5">
              <Clock size={16} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-[#0072BC] dark:text-[#72C8F1]">
                  Lama Dipergunakan
                </p>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-white truncate tabular-nums">
                  {lamaDipergunakan}
                </p>
              </div>
            </div>
          </div>

          {/* Row 4: Keperluan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
              Keperluan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={keperluan}
              maxLength={500}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Keperluan perjalanan dinas..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
            />
          </div>

          {/* Row 5: Stand KM Awal, Stand KM Akhir, Jarak Yang Ditempuh */}
          <div className="p-4 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Stand KM Awal
              </label>
              <input
                type="number"
                min={0}
                value={standKmAwal}
                onChange={(e) => setStandKmAwal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC] tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Stand KM Akhir
              </label>
              <input
                type="number"
                min={0}
                value={standKmAkhir}
                onChange={(e) => setStandKmAkhir(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC] tabular-nums"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5">
              <Gauge size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                  Jarak Yang Ditempuh
                </p>
                <p className="text-xs font-extrabold text-emerald-800 dark:text-white truncate tabular-nums">
                  {jarakTempuh.toLocaleString('id-ID')} km
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B172A] text-[#0072BC] dark:text-[#72C8F1] text-xs font-bold hover:border-[#0072BC] transition-colors"
            >
              <FileDown size={14} />
              Unduh PDF Perintah Jalan
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-[#F9D423]" />
                    Simpan Perintah Jalan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerintahJalanModal;
