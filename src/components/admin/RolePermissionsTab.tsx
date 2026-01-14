import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Shield, Eye, Pencil, Link2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RolePermission {
  id: string;
  role: string;
  permission_key: string;
  can_view: boolean;
  can_edit: boolean;
  scope: string;
}

const ROLES = [
  { value: 'sub_admin', label: 'Sub Admin', description: 'Asisten administrator' },
  { value: 'dosen', label: 'Dosen', description: 'Pengajar mata kuliah' },
  { value: 'mahasiswa', label: 'Mahasiswa', description: 'Peserta didik' },
  { value: 'guest', label: 'Guest', description: 'Pengguna tanpa akun' },
];

const PERMISSION_KEYS = [
  { 
    key: 'student_grades', 
    label: 'Data Nilai Mahasiswa',
    description: 'Nilai tugas dan ujian mahasiswa'
  },
  { 
    key: 'student_list', 
    label: 'Data Daftar Mahasiswa',
    description: 'Daftar mahasiswa pada tab ikhtisar & mahasiswa'
  },
  { 
    key: 'learning_outcomes', 
    label: 'Data Tab Capaian Pembelajaran',
    description: 'CPMK, Sub-CPMK, dan CPL'
  },
  { 
    key: 'achievement_stats', 
    label: 'Data Tab Statistik Capaian',
    description: 'Statistik dan grafik capaian pembelajaran'
  },
];

const SCOPES = [
  { value: 'connected', label: 'Terhubung', description: 'Hanya data yang terhubung dengannya' },
  { value: 'all', label: 'Semua', description: 'Semua data tanpa batasan' },
];

export function RolePermissionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<RolePermission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
      setHasChanges(false);
    }
  }, [permissions]);

  const updatePermissionsMutation = useMutation({
    mutationFn: async (updatedPermissions: RolePermission[]) => {
      for (const perm of updatedPermissions) {
        const { error } = await supabase
          .from('role_permissions')
          .update({
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            scope: perm.scope,
          })
          .eq('id', perm.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({ title: 'Berhasil', description: 'Pengaturan perizinan berhasil disimpan' });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const handlePermissionChange = (
    role: string, 
    permissionKey: string, 
    field: 'can_view' | 'can_edit' | 'scope', 
    value: boolean | string
  ) => {
    setLocalPermissions(prev => 
      prev.map(p => {
        if (p.role === role && p.permission_key === permissionKey) {
          const updated = { ...p, [field]: value };
          // If can_view is disabled, also disable can_edit
          if (field === 'can_view' && value === false) {
            updated.can_edit = false;
          }
          // If can_edit is enabled, also enable can_view
          if (field === 'can_edit' && value === true) {
            updated.can_view = true;
          }
          return updated;
        }
        return p;
      })
    );
    setHasChanges(true);
  };

  const getPermission = (role: string, permissionKey: string): RolePermission | undefined => {
    return localPermissions.find(p => p.role === role && p.permission_key === permissionKey);
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate(localPermissions);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery) return ROLES;
    const query = searchQuery.toLowerCase();
    return ROLES.filter(role => 
      role.label.toLowerCase().includes(query) || 
      role.description.toLowerCase().includes(query) ||
      PERMISSION_KEYS.some(perm => 
        perm.label.toLowerCase().includes(query) || 
        perm.description.toLowerCase().includes(query)
      )
    );
  }, [searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Pengaturan Perizinan Role
            </CardTitle>
            <CardDescription>
              Atur izin akses data untuk setiap role pengguna
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updatePermissionsMutation.isPending}
          >
            {updatePermissionsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari role atau permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {filteredRoles.map(role => (
          <div key={role.value} className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Badge variant="outline" className="text-base px-3 py-1">
                {role.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{role.description}</span>
            </div>
            
            <div className="grid gap-4">
              {PERMISSION_KEYS.map(perm => {
                const permission = getPermission(role.value, perm.key);
                if (!permission) return null;
                
                return (
                  <div 
                    key={perm.key} 
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      {/* Can View */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={permission.can_view}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(role.value, perm.key, 'can_view', !!checked)
                          }
                        />
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Lihat</span>
                      </label>
                      
                      {/* Can Edit */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={permission.can_edit}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(role.value, perm.key, 'can_edit', !!checked)
                          }
                          disabled={!permission.can_view}
                        />
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Ubah</span>
                      </label>
                      
                      {/* Scope */}
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={permission.scope}
                          onValueChange={(value) => 
                            handlePermissionChange(role.value, perm.key, 'scope', value)
                          }
                          disabled={!permission.can_view}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCOPES.map(scope => (
                              <SelectItem key={scope.value} value={scope.value}>
                                <div className="flex flex-col">
                                  <span>{scope.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-medium text-sm mb-2">Keterangan Scope:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Terhubung:</strong> Hanya dapat mengakses data yang terkait dengannya (contoh: dosen hanya melihat mahasiswa di mata kuliahnya)</li>
            <li>• <strong>Semua:</strong> Dapat mengakses semua data tanpa batasan</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
