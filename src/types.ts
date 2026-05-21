export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'employee';
export type EmployeeStatus = 'Pegawai Organik' | 'Pegawai Tugas Khusus' | 'Tenaga Alih Daya';
export type CompanyName = 'PT PLN Nusantara Power' | 'PT PLN (Persero)' | 'PT PLN Paguntaka Cahaya Nusantara' | 'PT Mitra Karya Prima';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  unitId?: string;
  employeeId?: string;
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
  createdAt: any;
  updatedAt: any;
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
