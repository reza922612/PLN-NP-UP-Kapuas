import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function calculateAge(birthDate: string) {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateTenure(appointmentDate: string) {
  if (!appointmentDate) return "0 Tahun";
  const today = new Date();
  const appointment = new Date(appointmentDate);
  let years = today.getFullYear() - appointment.getFullYear();
  let months = today.getMonth() - appointment.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years} Tahun ${months} Bulan`;
}

export function calculatePositionTenure(startDate?: string): string {
  if (!startDate) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
  const start = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (start > today) return "0 Tahun 0 Bulan";

  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  let days = today.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0 && months === 0) {
    return `0 Tahun 0 Bulan (${days} Hari)`;
  }
  return `${years} Tahun ${months} Bulan`;
}

