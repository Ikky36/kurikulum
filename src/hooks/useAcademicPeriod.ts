import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAcademicPeriod() {
  const { data: activeAcademicYear, isLoading: isLoadingYear } = useQuery({
    queryKey: ['active-academic-year-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('name')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching active academic year:", error);
        return null;
      }
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: activeSemester, isLoading: isLoadingSemester } = useQuery({
    queryKey: ['active-semester-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('name, order_index')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching active semester:", error);
        return null;
      }
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return {
    activeAcademicYear,
    activeSemester,
    isLoading: isLoadingYear || isLoadingSemester
  };
}
