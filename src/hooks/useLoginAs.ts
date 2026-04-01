import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ADMIN_SESSION_KEY = 'lovable_admin_session';
const storage = sessionStorage;

interface AdminSession {
  access_token: string;
  refresh_token: string;
  admin_name: string;
  admin_email: string;
  admin_role: string;
  impersonated_user_name: string;
  impersonated_at: string;
}

export function useLoginAs() {
  const { toast } = useToast();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Check if there's a saved admin session on mount
  useEffect(() => {
    const savedSession = storage.getItem(ADMIN_SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as AdminSession;
        setAdminSession(parsed);
        setIsImpersonating(true);
      } catch {
        storage.removeItem(ADMIN_SESSION_KEY);
      }
    }
  }, []);

  // Save admin session before impersonating
  const saveAdminSession = useCallback(async (
    targetUserName: string,
    adminName: string,
    adminEmail: string,
    adminRole: string
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const adminSessionData: AdminSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_role: adminRole,
        impersonated_user_name: targetUserName,
        impersonated_at: new Date().toISOString(),
      };
      
      storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSessionData));
      return true;
    }
    return false;
  }, []);

  // Restore admin session
  const restoreAdminSession = useCallback(async () => {
    const savedSession = storage.getItem(ADMIN_SESSION_KEY);
    if (!savedSession) {
      toast({
        title: 'Gagal',
        description: 'Tidak ada sesi admin yang tersimpan',
        variant: 'destructive',
      });
      return false;
    }

    setIsRestoring(true);

    try {
      const parsed = JSON.parse(savedSession) as AdminSession;
      
      // First sign out the current (impersonated) user
      await supabase.auth.signOut();
      
      // Then restore the admin session using refresh token
      const { error } = await supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });

      if (error) {
        throw error;
      }

      // Clear the saved session
      storage.removeItem(ADMIN_SESSION_KEY);
      setAdminSession(null);
      setIsImpersonating(false);

      toast({
        title: 'Berhasil',
        description: `Kembali sebagai ${parsed.admin_name}`,
      });

      // Redirect to admin dashboard
      window.location.href = '/dashboard/admin';
      return true;
    } catch (error: any) {
      console.error('Failed to restore admin session:', error);
      
      // If restore fails, clear the saved session and redirect to login
      storage.removeItem(ADMIN_SESSION_KEY);
      setAdminSession(null);
      setIsImpersonating(false);
      
      toast({
        title: 'Sesi Kadaluarsa',
        description: 'Sesi admin telah berakhir. Silakan login kembali.',
        variant: 'destructive',
      });
      
      window.location.href = '/auth';
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [toast]);

  // Clear impersonation state (for when admin logs out normally)
  const clearImpersonation = useCallback(() => {
    storage.removeItem(ADMIN_SESSION_KEY);
    setAdminSession(null);
    setIsImpersonating(false);
  }, []);

  return {
    isImpersonating,
    adminSession,
    isRestoring,
    saveAdminSession,
    restoreAdminSession,
    clearImpersonation,
  };
}
