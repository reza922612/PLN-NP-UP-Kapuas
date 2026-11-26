import React, { useEffect, useMemo, useState } from 'react';
import { X, History, AlertCircle, Loader2, ShieldAlert, FileCheck2 } from 'lucide-react';
import { EmployeeMutation, EmployeeStatus } from '../../types';
import {
  MUTATION_UNIT_KERJA_OPTIONS,
  getBidangOptionsByUnit,
} from '../../data/mutationConstants';
import { CorrectMutationInput } from '../../hooks/useMutations';
import { formatDate } from '../../lib/utils';

interface MutationCorrectionModalProps {
  mutation: EmployeeMutation | null;
  onClose: () => void;
  onCorrect: (mutation: EmployeeMutation, updates: CorrectMutationInput) => Promise<void>;
  onSuccess?: (message: string) => void;
}

const MutationCorrectionModal: React.FC<MutationCorrectionModalProps> = ({
  mutation,
  onClose,
  onCorrect,
  onSuccess,
}) => {
  const [jabatanBaru, setJabatanBaru] = useState('');
  const [unitKerjaBaru, setUnitKerjaBaru] = useState('UP Kapuas');
  const [bidangBaru, setBidangBaru] = useState('Manager UP');
  const [statusBaru, setStatusBaru] = useState<EmployeeStatus>('Pegawai Organik');
  const [entitasEksternal, setEntitasEksternal] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [nomorSk, setNomorSk] = useState('');
  const [tanggalSk, setTanggalSk] = useState('');
  const [alasanMutasi, setAlasanMutasi] = useState('');
  const [reason, setReason] = useState('');
  const [dokumenFile, setDokumenFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!mutation) return;
    setJabatanBaru(mutation.jabatanBaru);
    setUnitKerjaBaru(mutation.unitKerjaBaru);
    setBidangBaru(mutation.bidangBaru);
    setStatusBaru(mutation.statusKepegawaianBaru);
    setEntitasEksternal(mutation.entitasEksternal || '');
    setEffectiveDate(mutation.effectiveDate);
    setNomorSk(mutation.nomorSk);
    setTanggalSk(mutation.tanggalSk);
    setAlasanMutasi(mutation.alasanMutasi);
    setReason('');
    setDokumenFile(null);
    setErrorMsg(null);
  }, [mutation]);

  const availableBidangOptions = useMemo(
    () => getBidangOptionsByUnit(unitKerjaBaru),
    [unitKerjaBaru]
  );

  useEffect(() => {
    if (!availableBidangOptions.includes(bidangBaru)) {
      setBidangBaru(availableBidangOptions[0] || '');
    }
  }, [availableBidangOptions, bidangBaru]);

  if (!mutation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!reason.trim()) {
      setErrorMsg('Alasan koreksi wajib diisi untuk pencatatan jejak audit.');
      return;
    }
    if (!jabatanBaru.trim() || !nomorSk.trim() || !effectiveDate || !tanggalSk) {
      setErrorMsg('Pastikan Jabatan Baru, Nomor SK, Tanggal SK, dan Tanggal Efektif terisi.');
      return;
    }

    setSaving(true);
    try {
      await onCorrect(mutation, {
        jabatanBaru: jabatanBaru.trim(),
        bidangBaru: bidangBaru.trim(),
        unitKerjaBaru: unitKerjaBaru.trim(),
        statusKepegawaianBaru: statusBaru,
        entitasEksternal: mutation.jenisMutasi === 'Eksternal' ? entitasEksternal.trim() : null,
        effectiveDate,
        nomorSk: nomorSk.trim(),
        tanggalSk,
        alasanMutasi: alasanMutasi.trim(),
        dokumenFile,
        reason: reason.trim(),
      });
      onSuccess?.(`Koreksi mutasi ${mutation.employeeName} (SK ${nomorSk.trim()}) tercatat pada audit log.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan koreksi mutasi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        <div className="bg-[#173B65] px-6 py-4 text-white flex items-center justify-between gap-4 border-b-2 border-[#F9D423]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <History size={17} className="text-[#F9D423]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate">
                Koreksi Data Mutasi (Audit Terdokumentasi)
              </h3>
              <p className="text-[11px] text-white/75 truncate">
                {mutation.employeeName} · NIP {mutation.employeeNip}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 text-xs text-[#173B65] dark:text-[#72C8F1] flex items-start gap-2.5">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>
              Histori mutasi tidak pernah dihapus. Setiap koreksi akan menyimpan riwayat perubahan
              sebelum &amp; sesudah serta memperbarui data pegawai apabila mutasi ini merupakan
              penempatan aktif terakhir.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Unit Kerja Tujuan
              </label>
              <select
                value={unitKerjaBaru}
                onChange={(e) => setUnitKerjaBaru(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                {MUTATION_UNIT_KERJA_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bidang Tujuan
              </label>
              <select
                value={bidangBaru}
                onChange={(e) => setBidangBaru(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                {availableBidangOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Jabatan Baru
              </label>
              <input
                type="text"
                value={jabatanBaru}
                onChange={(e) => setJabatanBaru(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status Kepegawaian
              </label>
              <select
                value={statusBaru}
                onChange={(e) => setStatusBaru(e.target.value as EmployeeStatus)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                <option value="Pegawai Organik">Pegawai Organik</option>
                <option value="Pegawai Tugas Khusus">Pegawai Tugas Khusus</option>
                <option value="Tenaga Alih Daya">Tenaga Alih Daya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nomor SK Mutasi
              </label>
              <input
                type="text"
                value={nomorSk}
                onChange={(e) => setNomorSk(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tgl Efektif
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tgl SK
                </label>
                <input
                  type="date"
                  value={tanggalSk}
                  onChange={(e) => setTanggalSk(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          {mutation.jenisMutasi === 'Eksternal' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Perusahaan / Entitas Eksternal
              </label>
              <input
                type="text"
                value={entitasEksternal}
                onChange={(e) => setEntitasEksternal(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alasan / Keterangan Mutasi
            </label>
            <input
              type="text"
              value={alasanMutasi}
              onChange={(e) => setAlasanMutasi(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ganti Lampiran SK (Opsional)
            </label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setDokumenFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EAF6FC] file:text-[#0072BC] file:font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Alasan Koreksi (Wajib Dicatat di Jejak Audit) *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Koreksi penulisan nomor SK mutasi dan penyesuaian nama jabatan sesuai SK revisi..."
              className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC] resize-none"
            />
          </div>

          {mutation.correctionHistory && mutation.correctionHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Riwayat Koreksi Sebelumnya ({mutation.correctionHistory.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {[...mutation.correctionHistory].reverse().map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px]"
                  >
                    <p className="font-bold text-[#173B65] dark:text-slate-200">
                      {c.correctedByName} · {formatDate(c.correctedAt)}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Alasan: {c.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
              Simpan Koreksi Terdokumentasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MutationCorrectionModal;
