export interface ServiceUnitProfile {
  id: string;
  name: string;
  shortName: string;
  region: string;
  system: string;
  summary: string;
  role: string;
  matchKeywords: string[];
  focusAreas: string[];
  mapShareUrl?: string;
  mapSearchQueries?: string[];
}

export interface KnowledgeArticle {
  id: string;
  category: 'SOP' | 'Regulasi' | 'Pedoman' | 'Tutorial';
  title: string;
  summary: string;
  updatedLabel: string;
  readTime: string;
  audience: string;
  steps: string[];
}

export interface NewsItem {
  id: string;
  category: 'Berita' | 'Pengumuman' | 'Agenda';
  title: string;
  dateLabel: string;
  excerpt: string;
  content: string[];
  location: string;
}

export interface CommandNotification {
  id: string;
  type: 'Agenda' | 'Sistem' | 'SOP';
  title: string;
  message: string;
  timeLabel: string;
  targetSection?: string;
}

export const SERVICE_UNIT_PROFILES: ServiceUnitProfile[] = [
  {
    id: 'sei-raya',
    name: 'ULPLTD Sei Raya',
    shortName: 'Sei Raya',
    region: 'Kabupaten Kubu Raya, Kalimantan Barat',
    system: 'Sistem Khatulistiwa',
    summary:
      'Unit layanan pusat listrik strategis penyangga beban puncak kawasan Pontianak Raya dan Kabupaten Kubu Raya pada jaringan Sistem Khatulistiwa.',
    role: 'Penopang keandalan pasokan daya kawasan aglomerasi Pontianak–Kubu Raya dan kesiapan operasi pembangkit beban puncak.',
    matchKeywords: ['sei raya', 'sungai raya'],
    focusAreas: [
      'Monitoring kesiapan mesin & daya mampu nominal (DMN)',
      'Pengelolaan sertifikasi kompetensi operator pembangkit',
      'Pelaporan beban puncak terintegrasi Sistem Khatulistiwa',
    ],
    mapShareUrl: 'https://share.google/TywDM3n0XN8bx57Qb',
    mapSearchQueries: [
      'ULPLTD Sei Raya Kubu Raya Kalimantan Barat',
      'PLN Nusantara Power ULPLTD Sei Raya Sungai Raya',
      'PLTD Sungai Raya Adi Sucipto Kubu Raya',
    ],
  },
  {
    id: 'siantan',
    name: 'ULPLTG/D Siantan',
    shortName: 'Siantan',
    region: 'Pontianak Utara, Kalimantan Barat',
    system: 'Sistem Khatulistiwa',
    summary:
      'Pusat pembangkitan utama di koridor utara Sungai Kapuas yang menjaga stabilitas tegangan dan keandalan interkoneksi Sistem Khatulistiwa.',
    role: 'Menjaga kontinuitas operasi unit pembangkit serta pemeliharaan preventif aset mesin dan kesiapan personel teknik.',
    matchKeywords: ['siantan'],
    focusAreas: [
      'Pemantauan performa pembangkit berkapasitas besar',
      'Kepatuhan keselamatan kerja & sertifikasi K3 ketenagalistrikan',
      'Digitalisasi dossier teknis dan jadwal pemeliharaan unit',
    ],
  },
  {
    id: 'ketapang',
    name: 'ULPLTD Ketapang',
    shortName: 'Ketapang',
    region: 'Kabupaten Ketapang, Kalimantan Barat',
    system: 'Sistem Ketapang',
    summary:
      'Unit layanan pusat listrik wilayah selatan Kalimantan Barat yang melayani kebutuhan kelistrikan regional pada Sistem Ketapang.',
    role: 'Menjamin ketersediaan daya andal untuk wilayah pesisir selatan dan sentra pertumbuhan ekonomi Kabupaten Ketapang.',
    matchKeywords: ['ketapang'],
    focusAreas: [
      'Kemandirian operasi pada sistem kelistrikan Ketapang',
      'Pemetaan rasio beban puncak terhadap kapasitas DMN unit',
      'Pencatatan riwayat pelatihan dan kompetensi SDM lapangan',
    ],
  },
  {
    id: 'sanggau-sintang',
    name: 'ULPLTD Sanggau & Sintang',
    shortName: 'Sanggau & Sintang',
    region: 'Kabupaten Sanggau & Sintang, Kalimantan Barat',
    system: 'Sistem Khatulistiwa Timur / Sintang',
    summary:
      'Gugus unit layanan pembangkitan wilayah pedalaman timur Sungai Kapuas yang mendukung stabilitas suplai listrik koridor Sanggau hingga Sintang.',
    role: 'Menjaga keandalan pasokan energi listrik di wilayah timur Kalimantan Barat dengan koordinasi operasi lintas sub-unit.',
    matchKeywords: ['sanggau', 'sintang', 'kapuas'],
    focusAreas: [
      'Sinkronisasi data mesin multi-lokasi Sanggau dan Sintang',
      'Pelacakan dokumen dan identitas digital pegawai lintas unit',
      'Evaluasi kinerja keandalan pembangkit wilayah timur',
    ],
  },
];

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'sop-qr-verify',
    category: 'SOP',
    title: 'Prosedur Verifikasi Identitas Pegawai Menggunakan QR Code',
    summary:
      'Tata cara penerbitan kartu verifikasi digital dan validasi keaslian status aktif pegawai melalui halaman verifikasi publik SIMAP.',
    updatedLabel: 'Diperbarui November 2026',
    readTime: '4 menit baca',
    audience: 'Admin SDM & Umum',
    steps: [
      'Masuk ke Dashboard SIMAP menggunakan akun Admin atau Super Admin yang telah terverifikasi.',
      'Buka menu Data Pegawai dan pilih profil pegawai yang akan dicetak atau diverifikasi.',
      'Pada halaman Detail Pegawai, buka panel Kartu Identitas Digital untuk menampilkan QR Code unik pegawai.',
      'Setiap pemindaian QR Code mengarahkan pemeriksa ke halaman verifikasi publik non-PII yang menampilkan nama, NIP, unit pelaksana, dan status aktif terkini dari Firestore.',
    ],
  },
  {
    id: 'tutorial-scan-dokumen',
    category: 'Tutorial',
    title: 'Panduan Pemindaian Sertifikat & Dokumen Fisik via Kamera',
    summary:
      'Langkah praktis mendigitalisasi sertifikat kompetensi, KTP, atau surat tugas langsung melalui kamera perangkat tanpa aplikasi tambahan.',
    updatedLabel: 'Diperbarui November 2026',
    readTime: '3 menit baca',
    audience: 'Operator & Staf SDM',
    steps: [
      'Buka Detail Pegawai lalu pilih tab Dokumen Hasil Scan.',
      'Klik tombol Scan Dokumen Baru dan izinkan akses kamera pada browser perangkat Anda.',
      'Arahkan dokumen fisik pada bingkai pemindaian dengan pencahayaan merata, lalu ambil gambar dan pratinjau hasil tangkapan.',
      'Lengkapi judul dokumen, kategori (Sertifikat, Identitas, atau SK), serta catatan opsional sebelum menyimpan langsung ke repositori pegawai.',
    ],
  },
  {
    id: 'pedoman-data-unit',
    category: 'Pedoman',
    title: 'Pedoman Pencatatan DMN & Beban Puncak Unit Pembangkit',
    summary:
      'Standar pengisian parameter teknis mesin (Daya Mampu Nominal, Beban Puncak, Nomor Seri, dan Sistem Kelistrikan) pada modul Data Pembangkit.',
    updatedLabel: 'Diperbarui Oktober 2026',
    readTime: '5 menit baca',
    audience: 'Engineer & Pengelola Aset',
    steps: [
      'Pastikan setiap unit layanan memiliki koordinat lintang dan bujur akurat untuk pemetaan geografis.',
      'Catat seluruh mesin aktif beserta Tipe Mesin, Nomor Seri, Jenis Pembangkit (PLTD/PLTG/PLTU), dan Sistem Kelistrikan terkait.',
      'Mutakhirkan nilai Daya Mampu Nominal (kW) dan Beban Puncak (kW) secara berkala setelah uji mampu atau pemeliharaan besar.',
      'Setiap perubahan unit otomatis tercatat pada Activity Log dan memperbarui ringkasan statistik non-PII di Command Center.',
    ],
  },
  {
    id: 'regulasi-akses-audit',
    category: 'Regulasi',
    title: 'Tata Kelola Hak Akses (RBAC) & Jejak Audit Digital SIMAP',
    summary:
      'Ketentuan pemisahan peran Super Admin, Admin, Viewer, dan Pegawai beserta mekanisme pencatatan Activity Log yang bersifat immutable.',
    updatedLabel: 'Diperbarui Oktober 2026',
    readTime: '4 menit baca',
    audience: 'Seluruh Pengguna SIMAP',
    steps: [
      'Hak akses dibagi menjadi empat tingkat: Super Admin (kendali penuh & hapus data), Admin (kelola data pegawai/unit), Viewer (baca data), dan Pegawai (portal mandiri).',
      'Seluruh aksi penambahan, pembaruan, dan penghapusan pada data pegawai maupun unit terekam otomatis di Activity Log lengkap dengan identitas pelaku dan waktu server.',
      'Dokumen verifikasi publik hanya menampilkan atribut identitas resmi non-sensitif dan tidak mengekspos data pribadi seperti NIK, NPWP, atau nomor BPJS.',
      'Pengguna dapat menyesuaikan preferensi tema Terang atau Gelap pada Pengaturan Profil demi kenyamanan kerja di ruang kontrol maupun lapangan.',
    ],
  },
];

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-command-center',
    category: 'Berita',
    title: 'Transformasi SIMAP Menuju Digital Command Center UP Kapuas',
    dateLabel: '17 November 2026',
    location: 'UP Kapuas, Kalimantan Barat',
    excerpt:
      'Penyempurnaan antarmuka SIMAP menghadirkan pencarian global terpadu, pustaka pengetahuan operasional, serta ringkasan statistik aktual langsung dari basis data.',
    content: [
      'PT PLN Nusantara Power Unit Pembangkitan Kapuas terus memperkuat tata kelola operasional dan sumber daya manusia berbasis data melalui pembaruan platform SIMAP.',
      'Antarmuka baru mengintegrasikan akses cepat modul kepegawaian, pemetaan profil empat unit layanan utama (ULPLTD Sei Raya, ULPLTG/D Siantan, ULPLTD Ketapang, serta ULPLTD Sanggau & Sintang), dan pustaka pedoman kerja dalam satu portal terpusat.',
      'Seluruh metrik kepegawaian dan kapasitas pembangkit yang tampil pada infografis bersumber langsung dari rekaman aktual di database tanpa angka simulasi.',
    ],
  },
  {
    id: 'announcement-qr-scan',
    category: 'Pengumuman',
    title: 'Penerapan Fitur Scan Dokumen & Kartu Verifikasi QR Pegawai',
    dateLabel: '12 November 2026',
    location: 'Seluruh Unit Layanan UP Kapuas',
    excerpt:
      'Admin unit kini dapat memindai sertifikat kompetensi fisik secara langsung dan menerbitkan tautan verifikasi identitas pegawai berbasis QR Code.',
    content: [
      'Untuk mempercepat validasi administrasi di lapangan, modul Detail Pegawai telah dilengkapi generator QR Code yang terhubung dengan halaman verifikasi publik.',
      'Selain itu, fitur kamera terintegrasi memungkinkan pengunggahan dokumen sertifikasi pelatihan maupun dokumen kepegawaian fisik dengan kompresi gambar otomatis.',
      'Seluruh admin unit diimbau memastikan kelengkapan profil dan foto pegawai agar kartu verifikasi tampil optimal.',
    ],
  },
  {
    id: 'agenda-sinkronisasi-sertifikasi',
    category: 'Agenda',
    title: 'Pemutakhiran Berkala Data Sertifikasi & Masa Berlaku Kompetensi',
    dateLabel: '25 November 2026',
    location: 'Sistem Terintegrasi SIMAP',
    excerpt:
      'Agenda evaluasi kelengkapan sertifikat kompetensi ketenagalistrikan dan kesiapan data personel menjelang periode pelaporan akhir tahun.',
    content: [
      'Setiap penanggung jawab SDM di ULPLTD Sei Raya, ULPLTG/D Siantan, ULPLTD Ketapang, serta ULPLTD Sanggau & Sintang dijadwalkan melakukan peninjauan ulang masa berlaku sertifikasi pada menu Data Sertifikasi.',
      'Gunakan fitur ekspor CSV pada daftar pegawai untuk mempermudah rekonsiliasi laporan internal unit.',
      'Pegawai juga dapat masuk melalui Portal Pegawai Mandiri untuk memeriksa data pribadi dan riwayat pelatihan masing-masing.',
    ],
  },
];

export const COMMAND_NOTIFICATIONS: CommandNotification[] = [
  {
    id: 'notif-1',
    type: 'Sistem',
    title: 'Portal Command Center UP Kapuas Aktif',
    message: 'Gunakan pintasan Ctrl+K untuk mencari unit layanan, SOP, atau verifikasi ID pegawai secara cepat.',
    timeLabel: 'Terkini',
    targetSection: '#quick-access',
  },
  {
    id: 'notif-2',
    type: 'SOP',
    title: 'Panduan Pemindaian Dokumen via Kamera',
    message: 'Tersedia di Knowledge Center untuk membantu digitalisasi sertifikat kompetensi pegawai.',
    timeLabel: 'Knowledge Center',
    targetSection: '#knowledge',
  },
  {
    id: 'notif-3',
    type: 'Agenda',
    title: 'Rekonsiliasi Data Sertifikasi & Unit',
    message: 'Pastikan data mesin dan masa berlaku sertifikasi unit telah tersinkronisasi melalui Dashboard Admin.',
    timeLabel: 'Agenda Unit',
    targetSection: '#informasi',
  },
];
