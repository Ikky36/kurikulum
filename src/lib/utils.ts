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

import { Grade, Course, InstrumenPenilaian } from './types';

export function calculateIPK(
  grades: (Grade & { course?: Course })[], 
  instrumenList: InstrumenPenilaian[]
) {
  let totalSks = 0;
  let totalPoin = 0;

  grades.forEach(grade => {
    if (!grade) return;
    const sks = Number(grade.course?.sks) || 0;
    const score = Number(grade.final_score) || 0;
    const curriculumId = grade.course?.curriculum_id;

    const relevantInstrumen = (instrumenList || []).filter(i => 
      curriculumId ? i.curriculum_id === curriculumId : !i.curriculum_id
    );
    
    const activeInstrumen = relevantInstrumen.length > 0 
      ? relevantInstrumen 
      : (instrumenList || []).filter(i => !i.curriculum_id);

    const matched = activeInstrumen.find(i => score >= i.rentang_min && score <= i.rentang_max);
    const bobot = matched?.bobot || 0;

    totalSks += sks;
    totalPoin += (sks * bobot);
  });

  const ipk = totalSks > 0 ? (totalPoin / totalSks) : 0;
  
  return {
    totalSks,
    totalPoin,
    ipk: Number(ipk.toFixed(2)) || 0
  };
}
