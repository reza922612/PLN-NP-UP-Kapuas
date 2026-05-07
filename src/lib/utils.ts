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
