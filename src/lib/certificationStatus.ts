import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { Employee } from '../types';

export type CertificationStatusType = 'active' | 'warning' | 'expired';

export interface EvaluatedCertification {
  id: string;
  namaSertifikasi: string;
  tanggalPelaksanaan: string;
  masaBerlaku: string;
  certificateUrl?: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  unit: string;
  statusType: CertificationStatusType;
  daysLeft: number | null;
}

export const EXPIRY_WARNING_DAYS = 30;

export function evaluateCertificationStatus(
  masaBerlaku?: string,
  referenceDate: Date = new Date()
): { statusType: CertificationStatusType; daysLeft: number | null } {
  if (!masaBerlaku) {
    return { statusType: 'active', daysLeft: null };
  }

  try {
    const today = startOfDay(referenceDate);
    const expiryDate = startOfDay(parseISO(masaBerlaku));
    if (Number.isNaN(expiryDate.getTime())) {
      return { statusType: 'active', daysLeft: null };
    }

    const daysLeft = differenceInCalendarDays(expiryDate, today);

    if (daysLeft < 0) {
      return { statusType: 'expired', daysLeft };
    }
    if (daysLeft <= EXPIRY_WARNING_DAYS) {
      return { statusType: 'warning', daysLeft };
    }
    return { statusType: 'active', daysLeft };
  } catch {
    return { statusType: 'active', daysLeft: null };
  }
}

export function extractEvaluatedCertifications(
  employees: Employee[],
  referenceDate: Date = new Date()
): EvaluatedCertification[] {
  const list: EvaluatedCertification[] = [];

  employees.forEach((emp) => {
    (emp.certifications || []).forEach((cert, index) => {
      const { statusType, daysLeft } = evaluateCertificationStatus(
        cert.masaBerlaku,
        referenceDate
      );

      list.push({
        id: cert.id || `${emp.id}-cert-${index}`,
        namaSertifikasi: cert.namaSertifikasi,
        tanggalPelaksanaan: cert.tanggalPelaksanaan,
        masaBerlaku: cert.masaBerlaku,
        certificateUrl: cert.certificateUrl,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNip: emp.nip,
        unit: emp.unitPelaksana,
        statusType,
        daysLeft,
      });
    });
  });

  // Sort by urgency: expiring within 30 days first (closest first), then expired, then active
  const priority: Record<CertificationStatusType, number> = {
    warning: 0,
    expired: 1,
    active: 2,
  };

  return list.sort((a, b) => {
    const pDiff = priority[a.statusType] - priority[b.statusType];
    if (pDiff !== 0) return pDiff;

    if (a.daysLeft !== null && b.daysLeft !== null) {
      if (a.statusType === 'expired') {
        return b.daysLeft - a.daysLeft; // most recently expired first
      }
      return a.daysLeft - b.daysLeft; // nearest expiry first
    }
    if (a.daysLeft !== null) return -1;
    if (b.daysLeft !== null) return 1;
    return a.namaSertifikasi.localeCompare(b.namaSertifikasi);
  });
}
