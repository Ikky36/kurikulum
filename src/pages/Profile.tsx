import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { User, Mail, Shield, GraduationCap, Calendar } from 'lucide-react';
import { ChangePasswordCard } from '@/components/settings/ChangePasswordCard';
import { Badge } from '@/components/ui/badge';
import { SemesterBadge } from '@/components/ui/semester-badge';

export default function Profile() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    sub_admin: 'Sub Administrator',
    dosen: 'Dosen',
    mahasiswa: 'Mahasiswa',
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2 flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Profil Saya
          </h1>
          <p className="text-muted-foreground">
            Kelola informasi akun Anda
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Akun
              </CardTitle>
              <CardDescription>
                Detail informasi akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                  <p className="font-medium">{profile?.full_name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || user.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="secondary" className="mt-1">
                    {profile?.role ? roleLabels[profile.role] || profile.role : '-'}
                  </Badge>
                </div>
              </div>

              {profile?.role === 'mahasiswa' && (
                <>
                  {profile.nim && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">NIM</p>
                        <p className="font-medium">{profile.nim}</p>
                      </div>
                    </div>
                  )}
                  {profile.enrollment_year && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tahun Angkatan</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-medium">{profile.enrollment_year}</p>
                          <SemesterBadge enrollmentYear={profile.enrollment_year} variant="default" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {profile?.role === 'dosen' && profile.nip && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">NIP</p>
                    <p className="font-medium">{profile.nip}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <ChangePasswordCard />
        </div>
      </div>
    </Layout>
  );
}
