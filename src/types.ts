export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'employee';
export type EmployeeStatus = 'Pegawai Organik' | 'Pegawai Tugas Khusus' | 'Tenaga Alih Daya';
export type CompanyName = 'PT PLN Nusantara Power' | 'PT PLN (Persero)' | 'PT PLN Paguntaka Cahaya Nusantara' | 'PT Mitra Karya Prima';
export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  unitId?: string;
  employeeId?: string;
  themePreference?: ThemeMode;
  createdAt: any;
}

export type FamilyRelationship = 'Istri/Suami' | 'Anak Kandung';
export type HealthCoverageStatus = 'Dijamin' | 'Tidak Dijamin';

export interface FamilyMember {
  id?: string;
  nama: string;
  hubunganKeluarga: FamilyRelationship;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  jaminanKesehatan: HealthCoverageStatus;
  noKPS?: string;
}

export interface Employee {
  id?: string;
  fullName: string;
  nip: string;
  unitPelaksana: string;
  subUnit: string;
  jabatanLengkap: string;
  atasanId?: string | null;
  atasanNama?: string;
  atasanJabatan?: string;
  personGrade: string;
  positionGrade: string;
  tanggalMasuk: string;
  tanggalCalonPegawai: string;
  emailKorporat: string;
  alamatLengkap: string;
  tanggalLahir: string;
  tanggalMulaiJabatan: string;
  masaJabatan?: string;
  tanggalPengangkatan: string;
  tanggalBerakhirBekerja?: string;
  tanggalPensiunNormal: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  noTelepon: string;
  noNPWP: string;
  noKTP: string;
  noBPJSKesehatan: string;
  noBPJSKetenagakerjaan: string;
  noKPS?: string;
  pendidikanTerakhir: string;
  status: EmployeeStatus;
  perusahaan: CompanyName;
  placementStatus?: 'Aktif' | 'Mutasi Keluar';
  bidang?: string;
  externalEntity?: string | null;
  lastMutationId?: string | null;
  lastMutationDate?: string | null;
  lastMutationSkNumber?: string | null;
  photoUrl?: string;
  dossierUrl?: string;
  familyMembers?: FamilyMember[];
  // History collections can be separate but for the form we'll handle them
  trainings?: Training[];
  certifications?: Certification[];
  scannedDocuments?: ScannedDocument[];
  createdAt: any;
  updatedAt: any;
}

export interface ScannedDocument {
  id?: string;
  title: string;
  category: string;
  fileUrl: string;
  scannedAt: string;
  notes?: string;
}

export interface Training {
  id?: string;
  employeeId?: string;
  namaPelatihan: string;
  tanggalPelaksanaan: string;
  certificateUrl?: string;
}

export interface Certification {
  id?: string;
  employeeId?: string;
  namaSertifikasi: string;
  tanggalPelaksanaan: string;
  masaBerlaku: string;
  certificateUrl?: string;
}

export interface Machine {
  namaMesin: string;
  typeMesin: string;
  nomorSeri: string;
  dayaMampuNominal: number;
  bebanPuncak: number;
  jenisMesin: 'PLTD' | 'PLTG' | 'PLTU' | string;
  sistem: 'Sistem Khatulistiwa' | 'Sistem Ketapang' | 'Sistem Putusibau' | string;
}

export interface Unit {
  id?: string;
  namaUnitLayananPusatListrik: string;
  alamat: string;
  latitude?: number;
  longitude?: number;
  mesin: Machine[];
  photoUrl?: string;
  createdAt: any;
}

export interface Company {
  id?: string;
  name: string;
  description?: string;
}

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  level: number; // 0: Manager, 1: Assistant Manager, 2: Team Leader, 3: Staff
  children?: OrgNode[];
  employeeId?: string;
}

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type ActivityEntityType =
  | 'employee'
  | 'mutation'
  | 'unit'
  | 'system'
  | 'sppd'
  | 'knowledge'
  | 'publikasi'
  | 'vehicle'
  | 'letter_number';

export interface ActivityLog {
  id?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  description: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  actorRole?: string;
  createdAt: any;
}

export interface PublicEmployeeVerification {
  employeeId: string;
  fullName: string;
  nip: string;
  jabatanLengkap?: string;
  unitPelaksana: string;
  subUnit?: string;
  status: EmployeeStatus;
  perusahaan: CompanyName | string;
  photoUrl?: string | null;
  verifiedStatus: 'ACTIVE' | 'INACTIVE';
  updatedAt: any;
}

export interface PublicUnitSummary {
  id: string;
  name: string;
  address: string;
  machinesCount: number;
  capacityKW: number;
  peakLoadKW: number;
  systems: string[];
  machineTypes: string[];
}

export interface PublicStats {
  statId: string;
  totalEmployees: number;
  organicCount: number;
  taskForceCount: number;
  subcontractCount: number;
  totalUnits: number;
  totalMachines: number;
  totalCapacityKW: number;
  totalPeakLoadKW: number;
  systemBreakdown?: Record<string, { machines: number; capacityKW: number; peakLoadKW: number }>;
  machineTypeBreakdown?: Record<string, { machines: number; capacityKW: number }>;
  unitSummaries?: PublicUnitSummary[];
  updatedAt: any;
}

export interface BiometricCredentialRecord {
  id: string;
  userId: string;
  email: string;
  credentialId: string;
  deviceName: string;
  rpId: string;
  authenticatorType: 'platform';
  createdAt: any;
  lastUsedAt: any;
}

export type SppdStatus =
  | 'Draft'
  | 'Submitted'
  | 'Menunggu Approval'
  | 'Approved'
  | 'Rejected'
  | 'Completed';

export type SppdType = 'SPPD Diklat' | 'SPPD Non Diklat';

export type SppdTransportType =
  | 'Pesawat (Angkutan Udara)'
  | 'Bus / Taksi (Angkutan Darat)'
  | 'Kendaraan Dinas';

export type SppdUnitWork =
  | 'UP Kapuas'
  | 'ULPLTD Sei Raya'
  | 'ULPLTG/D Siantan'
  | 'ULPLTD Sanggau dan Sintang'
  | 'ULPLTD Ketapang';

export interface SppdAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface SppdRequest {
  id?: string;
  requestNumber: string;
  applicantUid: string;
  applicantEmail: string;
  employeeId?: string | null;
  namaPegawai: string;
  nip: string;
  jabatan: string;
  bidang: string;
  unitKerja: SppdUnitWork;
  jenisSppd: SppdType;
  judulPerjalanan: string;
  tanggalKeberangkatan: string;
  tanggalKembali: string;
  nomorPrk: string;
  nomorCoa: string;
  jenisTransportasi: SppdTransportType;
  kotaKeberangkatan: string;
  kotaTujuan: string;
  dokumenPendukung: SppdAttachment[];
  status: SppdStatus;
  nomorWhatsapp?: string | null;
  whatsappStatus?: WhatsAppNotificationStatus | null;
  whatsappProvider?: string | null;
  whatsappMessageId?: string | null;
  whatsappError?: string | null;
  whatsappSentAt?: string | null;
  approvalNotes?: string | null;
  approvedByName?: string | null;
  approvedByUid?: string | null;
  submittedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export type BroadcastPriority = 'info' | 'important' | 'urgent';

export interface BroadcastAnnouncement {
  id?: string;
  title: string;
  message: string;
  priority: BroadcastPriority;
  isActive: boolean;
  senderUid: string;
  senderName: string;
  createdAt: any;
  updatedAt: any;
}

export type KsfExecutionMethod = 'Online' | 'Offline';

export interface KnowledgeSharingForum {
  id?: string;
  pemateriEmployeeId?: string | null;
  namaPemateri: string;
  pemateriNip?: string | null;
  pemateriUnit?: string | null;
  judulMateri: string;
  tanggalPelaksanaan: string;
  lokasiPelaksanaan: string;
  metodePelaksanaan: KsfExecutionMethod;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface CommunityOfPractice {
  id?: string;
  judulTopik: string;
  leaderEmployeeId?: string | null;
  namaLeader: string;
  bidang: string;
  tanggalPelaksanaan: string;
  lokasi?: string | null;
  ringkasan?: string | null;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export type InnovationCategory =
  | 'Aplikasi'
  | 'Teknikal Supporting'
  | 'Pembangkitan'
  | 'Energi Baru Terbarukan (EBT)'
  | 'Breakthrough Idea'
  | 'Business Development';

export const INNOVATION_CATEGORIES: InnovationCategory[] = [
  'Aplikasi',
  'Teknikal Supporting',
  'Pembangkitan',
  'Energi Baru Terbarukan (EBT)',
  'Breakthrough Idea',
  'Business Development',
];

export interface InnovationRecord {
  id?: string;
  inovator1: string;
  inovator2: string;
  inovator3: string;
  inovatorEmployeeIds?: string[];
  judulInovasi: string;
  kategoriInovasi: InnovationCategory;
  tanggalPelaksanaan?: string | null;
  ringkasan?: string | null;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface SopDocument {
  id?: string;
  nomorDokumen: string;
  judul: string;
  bidang: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface RegulationDocument {
  id?: string;
  nomorDokumen: string;
  judul: string;
  penerbit: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface BoardRegulationDocument {
  id?: string;
  nomorDokumen: string;
  judul: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
}

export type KnowledgeSectionType =
  | 'knowledge-sharing'
  | 'cop'
  | 'inovasi'
  | 'sop'
  | 'regulasi'
  | 'peraturan-direksi';

export type PublicPublicationCategory = 'Berita' | 'Pengumuman' | 'Agenda Kegiatan TJSL';

export const PUBLIC_PUBLICATION_CATEGORIES: PublicPublicationCategory[] = [
  'Berita',
  'Pengumuman',
  'Agenda Kegiatan TJSL',
];

export interface PublicPublication {
  id?: string;
  kategori: PublicPublicationCategory;
  judul: string;
  tanggalKegiatan: string;
  lokasi: string;
  ringkasan: string;
  konten: string;
  penanggungJawab?: string | null;
  imageUrl?: string | null;
  imageFileName?: string | null;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  isPublished: boolean;
  createdByUid: string;
  createdByName?: string | null;
  createdAt: any;
  updatedAt: any;
}

export type VehicleStatus = 'Tersedia' | 'Sedang Dipinjam' | 'Perawatan';

export type VehicleType =
  | 'MPV'
  | 'SUV'
  | 'Double Cabin'
  | 'Sedan'
  | 'Bus / Minibus'
  | 'Pick Up / Operasional';

export interface VehicleUnit {
  id?: string;
  noPol: string;
  namaKendaraan: string;
  jenisKendaraan: VehicleType | string;
  kapasitasPenumpang: number;
  unitKerja: string;
  status: VehicleStatus;
  tahun?: string | null;
  kmTerakhir: number;
  createdAt: any;
  updatedAt: any;
}

export type DriverStatus = 'Aktif' | 'Cuti / Off';

export interface VehicleDriver {
  id?: string;
  namaDriver: string;
  noHp: string;
  noSim: string;
  employeeId?: string | null;
  unitKerja: string;
  status: DriverStatus;
  createdAt: any;
  updatedAt: any;
}

export interface VehicleTrackingPoint {
  lat: number;
  lng: number;
  speedKmh?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recordedAt: string;
  note?: string | null;
}

export interface PerintahJalanData {
  tanggal: string;
  driverId?: string | null;
  driverNama: string;
  berangkatJam: string;
  kembaliJam: string;
  lamaDipergunakan: string;
  vehicleId?: string | null;
  kendaraanNoPol: string;
  kendaraanNama: string;
  keperluan: string;
  standKmAwal: number;
  standKmAkhir: number;
  jarakTempuh: number;
  picUid: string;
  picNama: string;
  issuedAt: string;
}

export type VehicleLoanStatus =
  | 'Menunggu Persetujuan'
  | 'Disetujui'
  | 'Perintah Jalan Terbit'
  | 'Sedang Berpergian'
  | 'Selesai'
  | 'Ditolak';

export interface VehicleLoanRequest {
  id?: string;
  loanNumber: string;
  nama: string;
  jumlahPenumpang: number;
  tujuan: string;
  tanggalDipergunakan: string;
  bidang: string;
  keperluan: string;
  jamMulai: string;
  jamSelesai: string;
  durasiJam: string;
  pemohonEmployeeId?: string | null;
  pemohonNama: string;
  pemohonNip?: string | null;
  pemohonJabatan?: string | null;
  atasanLangsungEmployeeId?: string | null;
  atasanLangsungNama: string;
  atasanLangsungJabatan?: string | null;
  asmanBisnisSupportEmployeeId?: string | null;
  asmanBisnisSupportNama: string;
  asmanBisnisSupportJabatan?: string | null;
  perintahJalan?: PerintahJalanData | null;
  status: VehicleLoanStatus;
  nomorWhatsapp?: string | null;
  whatsappStatus?: WhatsAppNotificationStatus | null;
  whatsappProvider?: string | null;
  whatsappMessageId?: string | null;
  whatsappError?: string | null;
  whatsappSentAt?: string | null;
  rejectionReason?: string | null;
  isTrackingActive?: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  currentSpeedKmh?: number | null;
  lastLocationLabel?: string | null;
  trackingUpdatedAt?: string | null;
  trackingHistory?: VehicleTrackingPoint[];
  createdByUid: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt: any;
}

export type LetterCode = 'SKT' | 'BA' | 'BAPP' | 'BATK';

export type LetterClassificationCode = 'KEU.01.02' | 'ORG.00.02' | 'SDM.15.01';

export type LetterUnitCode = 'UPKS' | 'ULSR' | 'ULST' | 'ULKP' | 'ULSS';

export type LetterRequestStatus = 'Diterbitkan' | 'Dibatalkan';

export type WhatsAppNotificationStatus = 'Menunggu Pengiriman' | 'Terkirim' | 'Gagal';

export interface LetterNumberCounter {
  id?: string;
  counterId: string;
  unitKode: LetterUnitCode;
  tahun: number;
  lastSequence: number;
  lastRequestId: string;
  updatedAt: any;
}

export interface LetterNumberRequest {
  id?: string;
  requestId: string;
  counterId: string;
  sequenceNumber: number;
  sequenceLabel: string;
  nomorSurat: string;
  applicantEmployeeId?: string | null;
  namaPengaju: string;
  nip: string;
  bidang: string;
  tanggalPengajuan: string;
  nomorWhatsapp: string;
  kodeSurat: LetterCode;
  kodeKlasifikasi: LetterClassificationCode;
  unitKode: LetterUnitCode;
  unitLabel: string;
  tahun: number;
  perihal?: string | null;
  status: LetterRequestStatus;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  whatsappStatus: WhatsAppNotificationStatus;
  whatsappProvider?: string | null;
  whatsappMessageId?: string | null;
  whatsappError?: string | null;
  whatsappSentAt?: string | null;
  createdByUid: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt: any;
}

export type MutationType = 'Internal' | 'Eksternal';
export type ExternalMutationDirection = 'Masuk' | 'Keluar';
export type MutationCategory =
  | 'Mutasi Unit'
  | 'Mutasi Jabatan'
  | 'Mutasi Unit dan Jabatan';
export type MutationApprovalStatus =
  | 'Menunggu Persetujuan'
  | 'Disetujui'
  | 'Diterapkan'
  | 'Ditolak';

export interface MutationAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt: string;
}

export interface MutationCorrectionEntry {
  correctedAt: string;
  correctedByUid: string;
  correctedByName: string;
  reason: string;
  previousSummary: string;
  newSummary: string;
}

export interface EmployeeMutation {
  id?: string;
  mutationId: string;
  dedupeKey: string;
  employeeId: string;
  employeeNip: string;
  employeeName: string;
  jenisMutasi: MutationType;
  arahMutasi?: ExternalMutationDirection | null;
  subJenisMutasi: string;
  kategoriMutasi: MutationCategory;
  // Snapshot Before
  jabatanSebelumnya: string;
  bidangSebelumnya: string;
  unitKerjaSebelumnya: string;
  statusKepegawaianSebelumnya: EmployeeStatus;
  perusahaanSebelumnya: string;
  // Target After
  jabatanBaru: string;
  bidangBaru: string;
  unitKerjaBaru: string;
  statusKepegawaianBaru: EmployeeStatus;
  entitasEksternal?: string | null;
  // SK & Metadata
  effectiveDate: string;
  nomorSk: string;
  tanggalSk: string;
  alasanMutasi: string;
  dokumenPendukung?: MutationAttachment | null;
  // Workflow & Automation
  status: MutationApprovalStatus;
  appliedToEmployee: boolean;
  appliedAt?: string | null;
  rejectionReason?: string | null;
  approvalNotes?: string | null;
  approvedByUid?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  // Audit & Correction Trail
  correctionHistory?: MutationCorrectionEntry[];
  createdByUid: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
}


