import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import TugasAkhirAdmin from './tugas-akhir/TugasAkhirAdmin';
import TugasAkhirDosen from './tugas-akhir/TugasAkhirDosen';
import TugasAkhirMahasiswa from './tugas-akhir/TugasAkhirMahasiswa';

export default function TugasAkhir() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !profile) {
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

  // Route based on role
  if (profile.role === 'admin' || profile.role === 'sub_admin') {
    return <TugasAkhirAdmin />;
  }

  if (profile.role === 'dosen') {
    return <TugasAkhirDosen />;
  }

  return <TugasAkhirMahasiswa />;
}
