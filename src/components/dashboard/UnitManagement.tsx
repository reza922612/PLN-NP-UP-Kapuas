import React, { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Building2,
  MapPin,
  Zap,
  Plus,
  Trash2,
  Save,
  Camera,
  Loader2,
  AlertCircle,
  Activity,
  Cpu,
  ChevronDown,
  ChevronUp,
  Pencil,
  CheckCircle2,
  X,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUnits } from '../../hooks/useUnits';
import { Unit } from '../../types';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import imageCompression from 'browser-image-compression';
import {
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
  CardGridSkeleton,
  ConfirmDialog,
} from '../common/DashboardUI';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

const machineSchema = z.object({
  namaMesin: z.string().min(1, 'Nama mesin wajib diisi'),
  typeMesin: z.string().min(1, 'Type mesin wajib diisi'),
  nomorSeri: z.string().min(1, 'Nomor seri wajib diisi'),
  dayaMampuNominal: z.coerce.number().min(0),
  bebanPuncak: z.coerce.number().min(0),
  jenisMesin: z.string().min(1),
  sistem: z.string().min(1),
});

const unitSchema = z.object({
  namaUnitLayananPusatListrik: z.string().min(1, 'Nama unit wajib diisi'),
  alamatLengkap: z.string().min(1, 'Alamat wajib diisi'),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  mesin: z.array(machineSchema),
  photoUrl: z.any().optional(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

const UnitManagement: React.FC = () => {
  const { units, unitStats, loading, createUnit, updateUnit, deleteUnit } = useUnits();
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [showMapKeyHelp, setShowMapKeyHelp] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'pdf' | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as any,
    defaultValues: {
      namaUnitLayananPusatListrik: '',
      alamatLengkap: '',
      latitude: -1.7161,
      longitude: 109.5891,
      mesin: [
        {
          namaMesin: '',
          typeMesin: '',
          nomorSeri: '',
          dayaMampuNominal: 0,
          bebanPuncak: 0,
          jenisMesin: 'PLTD',
          sistem: 'Sistem Khatulistiwa',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'mesin' });

  const totalPeakLoad = useMemo(() => {
    return units.reduce(
      (sum, u) =>
        sum + (u.mesin?.reduce((mSum, m) => mSum + (Number(m.bebanPuncak) || 0), 0) || 0),
      0
    );
  }, [units]);

  const handleExportExcel = () => {
    if (units.length === 0) return;
    setExportingFormat('excel');
    try {
      const todaySlug = new Date().toISOString().slice(0, 10);

      const unitRows = units.map((unit, idx) => {
        const machines = unit.mesin || [];
        const totalDmn = machines.reduce((acc, m) => acc + (Number(m.dayaMampuNominal) || 0), 0);
        const totalBp = machines.reduce((acc, m) => acc + (Number(m.bebanPuncak) || 0), 0);
        const utilPct = totalDmn > 0 ? Math.round((totalBp / totalDmn) * 100) : 0;
        const machineTypes = Array.from(
          new Set(machines.map((m) => m.jenisMesin).filter(Boolean))
        ).join(', ');
        const systems = Array.from(
          new Set(machines.map((m) => m.sistem).filter(Boolean))
        ).join(', ');

        return {
          No: idx + 1,
          'Nama Unit Layanan': unit.namaUnitLayananPusatListrik || '-',
          'Alamat Lengkap': (unit as any).alamatLengkap || unit.alamat || '-',
          Latitude: unit.latitude ?? '-',
          Longitude: unit.longitude ?? '-',
          'Jumlah Mesin': machines.length,
          'Jenis Pembangkit': machineTypes || '-',
          'Sistem Kelistrikan': systems || '-',
          'Total DMN (kW)': totalDmn,
          'Total Beban Puncak (kW)': totalBp,
          'Rasio Utilisasi (%)': utilPct,
        };
      });

      const overallUtilPct =
        unitStats.totalCapacity > 0
          ? Math.round((totalPeakLoad / unitStats.totalCapacity) * 100)
          : 0;

      unitRows.push({
        No: '' as any,
        'Nama Unit Layanan': 'TOTAL UP KAPUAS',
        'Alamat Lengkap': `${unitStats.totalUnits} Unit Layanan`,
        Latitude: '-' as any,
        Longitude: '-' as any,
        'Jumlah Mesin': unitStats.totalMachines,
        'Jenis Pembangkit': '-',
        'Sistem Kelistrikan': '-',
        'Total DMN (kW)': unitStats.totalCapacity,
        'Total Beban Puncak (kW)': totalPeakLoad,
        'Rasio Utilisasi (%)': overallUtilPct,
      });

      const machineRows: Record<string, string | number>[] = [];
      let machineCounter = 0;
      units.forEach((unit) => {
        const machines = unit.mesin || [];
        if (machines.length === 0) {
          machineCounter += 1;
          machineRows.push({
            No: machineCounter,
            'Unit Layanan': unit.namaUnitLayananPusatListrik || '-',
            'Nama Mesin': 'Belum ada mesin terdaftar',
            'Tipe Mesin': '-',
            'Nomor Seri': '-',
            'Jenis Mesin': '-',
            'Sistem Kelistrikan': '-',
            'DMN (kW)': 0,
            'Beban Puncak (kW)': 0,
            'Utilisasi (%)': 0,
          });
          return;
        }
        machines.forEach((m) => {
          machineCounter += 1;
          const dmn = Number(m.dayaMampuNominal) || 0;
          const bp = Number(m.bebanPuncak) || 0;
          machineRows.push({
            No: machineCounter,
            'Unit Layanan': unit.namaUnitLayananPusatListrik || '-',
            'Nama Mesin': m.namaMesin || '-',
            'Tipe Mesin': m.typeMesin || '-',
            'Nomor Seri': m.nomorSeri || '-',
            'Jenis Mesin': m.jenisMesin || '-',
            'Sistem Kelistrikan': m.sistem || '-',
            'DMN (kW)': dmn,
            'Beban Puncak (kW)': bp,
            'Utilisasi (%)': dmn > 0 ? Math.round((bp / dmn) * 100) : 0,
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const wsUnits = XLSX.utils.json_to_sheet(unitRows);
      wsUnits['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 36 },
        { wch: 11 },
        { wch: 11 },
        { wch: 13 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, wsUnits, 'Ringkasan Unit');

      const wsMachines = XLSX.utils.json_to_sheet(machineRows);
      wsMachines['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMachines, 'Detail Mesin');

      XLSX.writeFile(wb, `Laporan_Unit_Pembangkit_UP_Kapuas_${todaySlug}.xlsx`);
      setExportNotice('Laporan Excel (.xlsx) data unit & mesin berhasil diunduh.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportPDF = () => {
    if (units.length === 0) return;
    setExportingFormat('pdf');
    try {
      const todaySlug = new Date().toISOString().slice(0, 10);
      const printedAt = new Date().toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Corporate Header Banner
      doc.setFillColor(0, 114, 188);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setFillColor(249, 212, 35);
      doc.rect(0, 24, pageWidth, 1.8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN DATA UNIT LAYANAN & ASET MESIN PEMBANGKIT', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `PT PLN Nusantara Power Unit Pembangkitan Kapuas  |  Dicetak: ${printedAt}`,
        14,
        18
      );

      // Executive Summary Strip
      const overallUtil =
        unitStats.totalCapacity > 0
          ? Math.round((totalPeakLoad / unitStats.totalCapacity) * 100)
          : 0;

      doc.setFillColor(234, 246, 252);
      doc.roundedRect(14, 30, pageWidth - 28, 14, 2, 2, 'F');
      doc.setTextColor(23, 59, 101);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Total Unit: ${unitStats.totalUnits}    |    Total Mesin: ${unitStats.totalMachines}    |    Total DMN: ${Number(
          unitStats.totalCapacity || 0
        ).toLocaleString('id-ID')} kW    |    Beban Puncak: ${totalPeakLoad.toLocaleString(
          'id-ID'
        )} kW    |    Utilisasi: ${overallUtil}%`,
        18,
        38.5
      );

      // Table 1: Ringkasan Unit Layanan
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 59, 101);
      doc.text('1. Ringkasan Unit Layanan Pembangkitan', 14, 52);

      const unitTableBody = units.map((unit, idx) => {
        const machines = unit.mesin || [];
        const totalDmn = machines.reduce((acc, m) => acc + (Number(m.dayaMampuNominal) || 0), 0);
        const totalBp = machines.reduce((acc, m) => acc + (Number(m.bebanPuncak) || 0), 0);
        const utilPct = totalDmn > 0 ? Math.round((totalBp / totalDmn) * 100) : 0;
        const machineTypes = Array.from(
          new Set(machines.map((m) => m.jenisMesin).filter(Boolean))
        ).join(', ');
        const coords =
          unit.latitude != null && unit.longitude != null
            ? `${Number(unit.latitude).toFixed(4)}, ${Number(unit.longitude).toFixed(4)}`
            : '-';

        return [
          idx + 1,
          unit.namaUnitLayananPusatListrik || '-',
          (unit as any).alamatLengkap || unit.alamat || '-',
          coords,
          machines.length,
          machineTypes || '-',
          totalDmn.toLocaleString('id-ID'),
          totalBp.toLocaleString('id-ID'),
          `${utilPct}%`,
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [
          [
            'No',
            'Unit Layanan',
            'Alamat Operasional',
            'Koordinat',
            'Mesin',
            'Jenis',
            'Total DMN (kW)',
            'Beban Puncak (kW)',
            'Utilisasi',
          ],
        ],
        body: unitTableBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [0, 114, 188], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 251, 253] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 14 },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'center', cellWidth: 18 },
        },
      });

      // Table 2: Rincian Mesin Pembangkit
      const lastTableY = (doc as any).lastAutoTable?.finalY || 100;
      let machineStartY = lastTableY + 12;
      if (machineStartY > 165) {
        doc.addPage();
        machineStartY = 18;
      }

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 59, 101);
      doc.text('2. Rincian Aset Mesin Pembangkit per Unit', 14, machineStartY);

      const machineBody: (string | number)[][] = [];
      let mIdx = 0;
      units.forEach((unit) => {
        (unit.mesin || []).forEach((m) => {
          mIdx += 1;
          const dmn = Number(m.dayaMampuNominal) || 0;
          const bp = Number(m.bebanPuncak) || 0;
          const util = dmn > 0 ? Math.round((bp / dmn) * 100) : 0;
          machineBody.push([
            mIdx,
            unit.namaUnitLayananPusatListrik || '-',
            m.namaMesin || '-',
            m.typeMesin || '-',
            m.nomorSeri || '-',
            m.jenisMesin || '-',
            m.sistem || '-',
            dmn.toLocaleString('id-ID'),
            bp.toLocaleString('id-ID'),
            `${util}%`,
          ]);
        });
      });

      if (machineBody.length > 0) {
        autoTable(doc, {
          startY: machineStartY + 3,
          head: [
            [
              'No',
              'Unit Layanan',
              'Nama Mesin',
              'Tipe',
              'Nomor Seri',
              'Jenis',
              'Sistem Kelistrikan',
              'DMN (kW)',
              'BP (kW)',
              'Utilisasi',
            ],
          ],
          body: machineBody,
          theme: 'grid',
          styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
          headStyles: { fillColor: [23, 59, 101], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 251, 253] },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            5: { halign: 'center', cellWidth: 15 },
            7: { halign: 'right' },
            8: { halign: 'right' },
            9: { halign: 'center', cellWidth: 16 },
          },
        });
      }

      // Page numbers & footer
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
          'SIMAP PT PLN Nusantara Power UP Kapuas · Dokumen Laporan Operasional',
          14,
          pageHeight - 8
        );
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, {
          align: 'right',
        });
      }

      doc.save(`Laporan_Unit_Pembangkit_UP_Kapuas_${todaySlug}.pdf`);
      setExportNotice('Laporan PDF data unit & mesin berhasil diunduh.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setExportingFormat(null);
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setLoadingStatus('Menyiapkan data...');
    try {
      const formData = data as UnitFormValues;
      let photoUrl = '';

      if (formData.photoUrl && formData.photoUrl[0] instanceof File) {
        setLoadingStatus('Mengompresi gambar...');
        const file = formData.photoUrl[0];
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            initialQuality: 0.6,
          });
          setLoadingStatus('Mengunggah gambar (0%)...');
          const storageRef = ref(storage, `units/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, compressedFile);

          await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                setLoadingStatus(`Mengunggah gambar (${progress}%)...`);
              },
              (error) => reject(error),
              () => resolve(true)
            );
          });

          photoUrl = await getDownloadURL(storageRef);
        } catch (compressionError) {
          console.error('Upload failed:', compressionError);
          setLoadingStatus('Gagal mengunggah gambar. Menyimpan tanpa foto...');
        }
      }

      setLoadingStatus('Menyimpan ke database...');
      const existingUnit = editingUnitId ? units.find((u) => u.id === editingUnitId) : null;
      const finalPhotoUrl = photoUrl || existingUnit?.photoUrl || null;

      if (editingUnitId) {
        await updateUnit(editingUnitId, {
          namaUnitLayananPusatListrik: formData.namaUnitLayananPusatListrik,
          alamatLengkap: formData.alamatLengkap,
          latitude: formData.latitude,
          longitude: formData.longitude,
          mesin: formData.mesin,
          photoUrl: finalPhotoUrl,
        } as any);
      } else {
        await createUnit({
          ...formData,
          photoUrl: finalPhotoUrl,
        } as any);
      }

      setIsAdding(false);
      setEditingUnitId(null);
      reset();
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleStartEdit = (unit: Unit) => {
    setEditingUnitId(unit.id || null);
    setPhotoPreview(unit.photoUrl || null);
    reset({
      namaUnitLayananPusatListrik: unit.namaUnitLayananPusatListrik || '',
      alamatLengkap: (unit as any).alamatLengkap || unit.alamat || '',
      latitude: unit.latitude ?? -1.7161,
      longitude: unit.longitude ?? 109.5891,
      mesin:
        unit.mesin && unit.mesin.length > 0
          ? unit.mesin
          : [
              {
                namaMesin: '',
                typeMesin: '',
                nomorSeri: '',
                dayaMampuNominal: 0,
                bebanPuncak: 0,
                jenisMesin: 'PLTD',
                sistem: 'Sistem Khatulistiwa',
              },
            ],
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const InputField = ({ label, name, type = 'text', placeholder, error, icon: Icon }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0072BC] dark:text-[#72C8F1]" />
        )}
        <input
          type={type}
          {...register(name)}
          placeholder={placeholder}
          className={cn(
            'w-full pr-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#0072BC] outline-none transition-all font-semibold text-[#173B65] dark:text-slate-100 placeholder:text-slate-400',
            Icon ? 'pl-10' : 'px-3.5',
            error && 'border-red-400'
          )}
        />
      </div>
      {error && <span className="text-[11px] text-red-500 font-semibold px-0.5">{error.message}</span>}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Data Pembangkit &amp; Unit Layanan"
        subtitle="Monitoring kapasitas terpasang, jenis mesin, lokasi operasional, dan pemetaan geografis UP Kapuas"
        icon={Building2}
        badge={`${unitStats.totalUnits} Unit · ${unitStats.totalMachines} Mesin`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || units.length === 0 || exportingFormat !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
              title="Export data unit dan mesin ke Excel (.xlsx)"
            >
              {exportingFormat === 'excel' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={15} />
              )}
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={loading || units.length === 0 || exportingFormat !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 dark:border-[#72C8F1]/30 text-[#173B65] dark:text-[#72C8F1] text-xs font-bold hover:bg-[#72C8F1]/25 transition-colors disabled:opacity-50"
              title="Export laporan operasional unit dan mesin ke PDF"
            >
              {exportingFormat === 'pdf' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileText size={15} />
              )}
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isAdding) {
                  setIsAdding(false);
                  setEditingUnitId(null);
                  setPhotoPreview(null);
                  reset();
                } else {
                  setEditingUnitId(null);
                  setPhotoPreview(null);
                  reset({
                    namaUnitLayananPusatListrik: '',
                    alamatLengkap: '',
                    latitude: -1.7161,
                    longitude: 109.5891,
                    mesin: [
                      {
                        namaMesin: '',
                        typeMesin: '',
                        nomorSeri: '',
                        dayaMampuNominal: 0,
                        bebanPuncak: 0,
                        jenisMesin: 'PLTD',
                        sistem: 'Sistem Khatulistiwa',
                      },
                    ],
                  });
                  setIsAdding(true);
                }
              }}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs',
                isAdding
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  : 'bg-[#0072BC] text-white hover:bg-[#173B65]'
              )}
            >
              {isAdding ? (
                <>
                  <X size={15} /> Batal
                </>
              ) : (
                <>
                  <Plus size={15} /> Tambah Unit
                </>
              )}
            </button>
          </div>
        }
      />

      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Infographic Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Unit Layanan"
          value={unitStats.totalUnits}
          subtitle="Lokasi unit pembangkit aktif"
          icon={Building2}
          accent="blue"
        />
        <MetricCard
          title="Jumlah Mesin"
          value={unitStats.totalMachines}
          subtitle="Unit pembangkit terdaftar"
          icon={Cpu}
          accent="cyan"
        />
        <MetricCard
          title="Kapasitas Terpasang (DMN)"
          value={Number(unitStats.totalCapacity || 0).toLocaleString('id-ID')}
          unit="kW"
          subtitle="Daya mampu nominal total"
          icon={Zap}
          accent="yellow"
        />
        <MetricCard
          title="Beban Puncak Gabungan"
          value={totalPeakLoad.toLocaleString('id-ID')}
          unit="kW"
          subtitle={
            unitStats.totalCapacity > 0
              ? `Utilisasi ${Math.round((totalPeakLoad / unitStats.totalCapacity) * 100)}%`
              : 'Realisasi beban'
          }
          icon={Activity}
          accent="navy"
        />
      </div>

      {/* Add / Edit Unit Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SectionCard
              title={editingUnitId ? 'Edit Unit Layanan & Mesin' : 'Tambah Unit Layanan Baru'}
              subtitle="Lengkapi informasi lokasi pembangkit dan spesifikasi mesin terpasang"
              icon={Building2}
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InputField
                    label="Nama Unit Layanan"
                    name="namaUnitLayananPusatListrik"
                    icon={Building2}
                    placeholder="Contoh: ULPLTD Siantan"
                    error={errors.namaUnitLayananPusatListrik}
                  />
                  <InputField
                    label="Alamat Lengkap"
                    name="alamatLengkap"
                    icon={MapPin}
                    placeholder="Alamat lokasi pembangkit..."
                    error={errors.alamatLengkap}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Latitude" name="latitude" type="number" placeholder="Lat" error={errors.latitude} />
                    <InputField label="Longitude" name="longitude" type="number" placeholder="Lng" error={errors.longitude} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 uppercase tracking-wider">
                      Daftar Mesin Pembangkit ({fields.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        append({
                          namaMesin: '',
                          typeMesin: '',
                          nomorSeri: '',
                          dayaMampuNominal: 0,
                          bebanPuncak: 0,
                          jenisMesin: 'PLTD',
                          sistem: 'Sistem Khatulistiwa',
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
                    >
                      <Plus size={14} /> Tambah Mesin
                    </button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-4 bg-[#F4F8FB] dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative"
                      >
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-[#0E1A2E] shadow-sm border border-slate-200 dark:border-slate-700 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50"
                          title="Hapus Mesin"
                        >
                          <Trash2 size={12} />
                        </button>
                        <InputField label="Nama Mesin" name={`mesin.${index}.namaMesin`} placeholder="Contoh: Caterpillar" error={errors.mesin?.[index]?.namaMesin} />
                        <InputField label="Tipe Mesin" name={`mesin.${index}.typeMesin`} placeholder="3516B" error={errors.mesin?.[index]?.typeMesin} />
                        <InputField label="Nomor Seri" name={`mesin.${index}.nomorSeri`} placeholder="S/N: 12345" error={errors.mesin?.[index]?.nomorSeri} />
                        <div className="grid grid-cols-2 gap-2">
                          <InputField label="DMN (kW)" name={`mesin.${index}.dayaMampuNominal`} type="number" error={errors.mesin?.[index]?.dayaMampuNominal} />
                          <InputField label="BP (kW)" name={`mesin.${index}.bebanPuncak`} type="number" error={errors.mesin?.[index]?.bebanPuncak} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Jenis Mesin
                          </label>
                          <select
                            {...register(`mesin.${index}.jenisMesin`)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none"
                          >
                            <option value="PLTD">PLTD (Diesel)</option>
                            <option value="PLTG">PLTG (Gas)</option>
                            <option value="PLTU">PLTU (Uap)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Sistem Kelistrikan
                          </label>
                          <select
                            {...register(`mesin.${index}.sistem`)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none"
                          >
                            <option value="Sistem Khatulistiwa">Sistem Khatulistiwa</option>
                            <option value="Sistem Ketapang">Sistem Ketapang</option>
                            <option value="Sistem Putusibau">Sistem Putusibau</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-end justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full md:w-64">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Foto Pembangkit
                    </label>
                    <div className="relative h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50 flex flex-col items-center justify-center p-2 overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={22} className="text-[#0072BC] dark:text-[#72C8F1]" />
                          <span className="text-[10px] font-bold text-slate-400 mt-1">Pilih Foto Unit</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        {...register('photoUrl')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPhotoPreview(URL.createObjectURL(file));
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingUnitId(null);
                        setPhotoPreview(null);
                        reset();
                      }}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>{loadingStatus || 'Menyimpan...'}</span>
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          <span>{editingUnitId ? 'Simpan Perubahan' : 'Simpan Unit & Mesin'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unit Cards Grid */}
      {loading ? (
        <CardGridSkeleton count={4} />
      ) : units.length === 0 ? (
        <div className="corporate-card">
          <EmptyState
            icon={Building2}
            title="Belum ada unit pembangkit terdaftar"
            description="Klik Tambah Unit di pojok kanan atas untuk mendaftarkan lokasi unit layanan dan mesin pembangkit."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {units.map((unit) => {
            const totalDmn =
              unit.mesin?.reduce((acc, m) => acc + (Number(m.dayaMampuNominal) || 0), 0) || 0;
            const totalBp =
              unit.mesin?.reduce((acc, m) => acc + (Number(m.bebanPuncak) || 0), 0) || 0;
            const utilPct = totalDmn > 0 ? Math.min(100, Math.round((totalBp / totalDmn) * 100)) : 0;
            const machineTypes = Array.from(new Set((unit.mesin || []).map((m) => m.jenisMesin).filter(Boolean)));
            const isExpanded = expandedUnit === unit.id;

            return (
              <div key={unit.id} className="corporate-card overflow-hidden flex flex-col">
                <div className="p-6 flex flex-col sm:flex-row gap-5">
                  <div className="w-full sm:w-36 h-36 rounded-2xl bg-[#EAF6FC] dark:bg-slate-800 overflow-hidden shrink-0 relative flex items-center justify-center border border-[#72C8F1]/30 dark:border-slate-700">
                    {unit.photoUrl ? (
                      <img
                        src={unit.photoUrl}
                        alt={unit.namaUnitLayananPusatListrik}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="text-[#0072BC]/40 dark:text-slate-600" size={42} />
                    )}
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold">
                      <CheckCircle2 size={11} />
                      Beroperasi
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-base font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                          {unit.namaUnitLayananPusatListrik}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                          <MapPin size={13} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                          <span className="line-clamp-1">
                            {(unit as any).alamatLengkap || unit.alamat || '-'}
                          </span>
                        </p>
                        {machineTypes.length > 0 && (
                          <p className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] mt-1">
                            Jenis Mesin: {machineTypes.join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(unit)}
                          title="Edit Unit"
                          className="p-2 rounded-lg text-slate-400 hover:text-[#0072BC] dark:hover:text-[#72C8F1] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUnit(unit)}
                          title="Hapus Unit"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Mesin</p>
                          <p className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 tabular-nums">
                            {unit.mesin?.length || 0}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20">
                          <p className="text-[10px] font-bold uppercase text-[#0072BC] dark:text-[#72C8F1]">
                            Total DMN
                          </p>
                          <p className="text-sm font-extrabold text-[#173B65] dark:text-white tabular-nums">
                            {totalDmn.toLocaleString('id-ID')} <span className="text-[10px]">kW</span>
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Beban Puncak</p>
                          <p className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 tabular-nums">
                            {totalBp.toLocaleString('id-ID')} <span className="text-[10px]">kW</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>Rasio Beban Puncak / DMN</span>
                          <span className="text-[#0072BC] dark:text-[#72C8F1] tabular-nums">{utilPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#EAF6FC] dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#0072BC] to-[#72C8F1] rounded-full"
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedUnit(isExpanded ? null : unit.id || null)}
                  className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#0B172A]/60 text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center gap-1.5 hover:bg-[#EAF6FC]/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={15} /> Tutup Rincian Mesin
                    </>
                  ) : (
                    <>
                      <ChevronDown size={15} /> Lihat Rincian Mesin ({unit.mesin?.length || 0})
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-100 dark:border-slate-800 bg-[#F4F8FB] dark:bg-[#091426] p-5 overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        {unit.mesin?.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-[#0E1A2E] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 flex items-center justify-center text-[#0072BC] dark:text-[#72C8F1]">
                                <Cpu size={15} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#173B65] dark:text-slate-100">
                                  {m.namaMesin}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {m.typeMesin} · S/N {m.nomorSeri}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Sistem</p>
                                <p className="font-bold text-[#0072BC] dark:text-[#72C8F1]">{m.sistem}</p>
                              </div>
                              <div className="text-right tabular-nums">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">DMN / BP</p>
                                <p className="font-bold text-[#173B65] dark:text-slate-200">
                                  {m.dayaMampuNominal} / {m.bebanPuncak} kW
                                </p>
                              </div>
                              <span className="px-2 py-0.5 bg-[#EAF6FC] dark:bg-slate-800 rounded-md text-[10px] font-bold text-[#173B65] dark:text-slate-300">
                                {m.jenisMesin}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Geographical Map Section */}
      <SectionCard
        title="Pemetaan Geografis Unit Layanan"
        subtitle="Sebaran titik koordinat unit pembangkit PLN Nusantara Power UP Kapuas"
        icon={MapPin}
        bodyClassName="p-0"
      >
        <div className="h-[420px] relative">
          {!API_KEY ? (
            <div className="absolute inset-0 bg-[#F4F8FB] dark:bg-[#091426] flex flex-col items-center justify-center p-6 text-center">
              <div className="corporate-card p-6 max-w-md space-y-3">
                <AlertCircle size={32} className="text-amber-500 mx-auto" />
                <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                  Google Maps API Key Belum Dikonfigurasi
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tambahkan <code className="font-mono text-[#0072BC]">GOOGLE_MAPS_PLATFORM_KEY</code> pada environment aplikasi untuk menampilkan peta interaktif.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMapKeyHelp((v) => !v)}
                  className="px-4 py-2 bg-[#173B65] text-white rounded-xl text-xs font-bold hover:bg-[#0072BC] transition-colors"
                >
                  {showMapKeyHelp ? 'Tutup Panduan' : 'Cara Konfigurasi Key'}
                </button>
                {showMapKeyHelp && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-[#F4F8FB] dark:bg-slate-800/70 p-3 rounded-xl text-left leading-relaxed">
                    1. Aktifkan Maps JavaScript API di Google Cloud Console. 2. Set variabel environment{' '}
                    <span className="font-mono">GOOGLE_MAPS_PLATFORM_KEY</span>. 3. Restart server pengembangan.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: -1.7161, lng: 109.5891 }}
                defaultZoom={8}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                gestureHandling="greedy"
                disableDefaultUI={true}
              >
                {units.map(
                  (unit) =>
                    unit.latitude &&
                    unit.longitude && (
                      <AdvancedMarker
                        key={unit.id}
                        position={{ lat: Number(unit.latitude), lng: Number(unit.longitude) }}
                        title={unit.namaUnitLayananPusatListrik}
                      >
                        <Pin background="#0072BC" glyphColor="#F9D423" borderColor="#173B65" />
                      </AdvancedMarker>
                    )
                )}
              </Map>
            </APIProvider>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDeleteUnit}
        title="Hapus Unit Layanan?"
        description={
          confirmDeleteUnit ? (
            <>
              Anda akan menghapus unit{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-100">
                {confirmDeleteUnit.namaUnitLayananPusatListrik}
              </span>{' '}
              beserta daftar mesinnya. Tindakan ini dicatat di Activity Log.
            </>
          ) : null
        }
        loading={deleting}
        onCancel={() => setConfirmDeleteUnit(null)}
        onConfirm={async () => {
          if (!confirmDeleteUnit?.id) return;
          setDeleting(true);
          try {
            await deleteUnit(confirmDeleteUnit.id);
            setConfirmDeleteUnit(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
};

export default UnitManagement;
