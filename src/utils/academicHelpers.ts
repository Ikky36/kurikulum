export function calculateSemester(enrollmentYear: number | null | undefined, activeAcademicYearStr: string | undefined, activeSemesterName: string | undefined): number | null {
  if (!enrollmentYear || !activeAcademicYearStr) return null;

  // Extract the starting year from format like "2024/2025"
  const startYearMatch = activeAcademicYearStr.match(/^(\d{4})/);
  if (!startYearMatch) return null;

  const startYear = parseInt(startYearMatch[1], 10);
  
  // If the active academic year is somehow before the student enrolled, or same year.
  // Actually, year difference is startYear - enrollmentYear.
  const yearDiff = startYear - enrollmentYear;

  // If negative (student from the future?), just default to 1 or null
  if (yearDiff < 0) return 1;

  // Semester addition: typically Ganjil (Odd) is 1st semester of the year, Genap (Even) is 2nd.
  // If semester is not specified, default to 1.
  const isGenap = activeSemesterName && activeSemesterName.toLowerCase().includes('genap');
  
  const additionalSemester = isGenap ? 2 : 1;
  
  return (yearDiff * 2) + additionalSemester;
}
