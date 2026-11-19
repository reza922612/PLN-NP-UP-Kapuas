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
  pendidikanTerakhir: string;
  status: EmployeeStatus;
  perusahaan: CompanyName;
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
export type ActivityEntityType = 'employee' | 'unit' | 'system' | 'sppd' | 'knowledge' | 'publikasi';

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
