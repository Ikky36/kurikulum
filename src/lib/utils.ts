import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getVmtsAcronym(level: 'pt' | 'upps' | 'ps', rawSettings: Record<string, string>): string {
  let acronym = '';
  if (rawSettings[`show_vmts_${level}_visi`] !== 'false') acronym += 'V';
  if (rawSettings[`show_vmts_${level}_misi`] !== 'false') acronym += 'M';
  if (rawSettings[`show_vmts_${level}_tujuan`] !== 'false') acronym += 'T';
  if (rawSettings[`show_vmts_${level}_strategi`] !== 'false') acronym += 'S';
  return acronym || 'VMTS'; // Default if everything is off
}
