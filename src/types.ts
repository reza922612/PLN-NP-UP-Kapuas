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

export interface Employee {
  id?: string;
  fullName: string;
  nip: string;
  unitPelaksana: string;
  subUnit: string;
  jabatanLengkap: string;
  personGrade: string;
  positionGrade: string;
  tanggalMasuk: string;
  tanggalCalonPegawai: string;
  emailKorporat: string;
  alamatLengkap: string;
  tanggalLahir: string;
  tanggalMulaiJabatan: string;
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
export type ActivityEntityType = 'employee' | 'unit' | 'system';

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
