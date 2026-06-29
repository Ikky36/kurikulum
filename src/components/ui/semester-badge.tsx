import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useAcademicPeriod } from '@/hooks/useAcademicPeriod';
import { calculateSemester } from '@/utils/academicHelpers';

interface SemesterBadgeProps {
  enrollmentYear?: number | null;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function SemesterBadge({ enrollmentYear, className, variant = "outline" }: SemesterBadgeProps) {
  const { activeAcademicYear, activeSemester, isLoading } = useAcademicPeriod();

  if (!enrollmentYear) {
    return null;
  }

  if (isLoading) {
    return <Badge variant={variant} className={`animate-pulse ${className || ''}`}>Smt ...</Badge>;
  }

  const currentSemester = calculateSemester(
    enrollmentYear, 
    activeAcademicYear?.name, 
    activeSemester?.name
  );

  if (!currentSemester) {
    return null;
  }

  return (
    <Badge variant={variant} className={className}>
      Smt {currentSemester}
    </Badge>
  );
}

interface StudentSemesterBadgeProps {
  studentId: string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function StudentSemesterBadge({ studentId, className, variant = "outline" }: StudentSemesterBadgeProps) {
  const { data: enrollmentYear, isLoading } = useQuery({
    queryKey: ['student-enrollment', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('enrollment_year')
        .eq('id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data?.enrollment_year || null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading || !enrollmentYear) return null;

  return <SemesterBadge enrollmentYear={enrollmentYear} className={className} variant={variant} />;
}
