import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProgramFilter() {
  const { profile } = useAuth();
  
  const [selectedProgramId, setSelectedProgramId] = useState<string | 'all'>(() => {
    return localStorage.getItem('selectedProgramId') || 'all';
  });

  useEffect(() => {
    if (selectedProgramId) {
      localStorage.setItem('selectedProgramId', selectedProgramId);
    }
  }, [selectedProgramId]);

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('*');
      return data || [];
    },
  });

  const isAdminProdiOrDosen = profile?.role === 'sub_admin' || profile?.role === 'dosen';
  const hasGlobalAccess = profile?.role === 'admin' || profile?.role === 'super_admin';

  let resolvedProgramId = selectedProgramId;
  if (isAdminProdiOrDosen && profile?.program) {
    const matched = programs.find(p => p.name === profile.program);
    if (matched) {
      resolvedProgramId = matched.id;
    } else {
      resolvedProgramId = 'all';
    }
  }

  return {
    selectedProgramId,
    setSelectedProgramId,
    resolvedProgramId,
    isAdminProdiOrDosen,
    hasGlobalAccess,
    programs
  };
}
