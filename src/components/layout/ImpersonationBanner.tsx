import { useLoginAs } from '@/hooks/useLoginAs';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImpersonationBanner() {
  const { profile } = useAuth();
  const { isImpersonating, adminSession, isRestoring, restoreAdminSession } = useLoginAs();

  if (!isImpersonating || !adminSession) {
    return null;
  }

  return (
    <div className={cn(
      "sticky top-16 z-40 w-full border-b bg-warning/90 backdrop-blur-lg",
      "text-warning-foreground px-4 py-2"
    )}>
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Mode Impersonasi:</span>
            <span className="ml-1">
              Anda login sebagai <strong>{profile?.full_name || 'User'}</strong>
            </span>
            <span className="hidden sm:inline opacity-80 ml-2">
              (Admin: {adminSession.admin_name})
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={restoreAdminSession}
          disabled={isRestoring}
          className="bg-background/90 hover:bg-background border-border flex-shrink-0"
        >
          {isRestoring ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Kembali ke </span>
              {adminSession.admin_role === 'admin' ? 'Admin' : 'Sub-Admin'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
