import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (profile) {
        switch (profile.role) {
          case 'admin':
            navigate('/dashboard/admin');
            break;
          case 'sub_admin':
            navigate('/dashboard/admin');
            break;
          case 'dosen':
            navigate('/dashboard/dosen');
            break;
          case 'mahasiswa':
          default:
            navigate('/dashboard/mahasiswa');
            break;
        }
      }
    }
  }, [user, profile, loading, navigate]);

  return (
    <Layout>
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </Layout>
  );
}
