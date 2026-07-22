import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Pencil, Palette, BookOpen, GraduationCap, Settings as SettingsIcon, Image, Shield, Type, FileText, Key, Sparkles, Eye, EyeOff, Scale, CheckCircle2, XCircle, Zap, Wifi, WifiOff, Cloud, Calendar, Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Curriculum, Program, AppSetting, InstrumenPenilaian } from '@/lib/types';
import { RolePermissionsTab } from '@/components/admin/RolePermissionsTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SistemKuliahManager } from '@/components/admin/SistemKuliahManager';
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { getVmtsAcronym } from '@/lib/utils';

export default function Settings() {
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: appSettings } = useAppSettings();
  const updateAppSetting = useUpdateAppSetting();

  // Curriculum state
  const [showCurriculumDialog, setShowCurriculumDialog] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [curriculumName, setCurriculumName] = useState('');
  const [curriculumDescription, setCurriculumDescription] = useState('');
  const [curriculumAcademicYearIds, setCurriculumAcademicYearIds] = useState<string[]>([]);

  // Academic Year state
  const [showAcademicYearDialog, setShowAcademicYearDialog] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<any>(null);
  const [academicYearName, setAcademicYearName] = useState('');

  // Semester state
  const [showSemesterDialog, setShowSemesterDialog] = useState(false);
  const [editingSemester, setEditingSemester] = useState<any>(null);
  const [semesterName, setSemesterName] = useState('');
  const [semesterOrder, setSemesterOrder] = useState('');
  const [semesterMaxSks, setSemesterMaxSks] = useState('24');

  // Program state
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programCode, setProgramCode] = useState('');
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');

  // Theme state
  const [appName, setAppName] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [footerText, setFooterText] = useState('');
  const [enableTutorial, setEnableTutorial] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('');
  const [uploading, setUploading] = useState(false);

  // AI API Key state
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  // Prompts state
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  // Instrumen state
  const [showInstrumenDialog, setShowInstrumenDialog] = useState(false);
  const [editingInstrumen, setEditingInstrumen] = useState<InstrumenPenilaian | null>(null);
  const [instrumenMin, setInstrumenMin] = useState('');
  const [instrumenMax, setInstrumenMax] = useState('');
  const [instrumenPredikat, setInstrumenPredikat] = useState('');
  const [instrumenColor, setInstrumenColor] = useState('#22c55e');

  // Fetch curricula
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data as Program[];
    },
  });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch semesters
  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('semesters').select('*').order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Fetch curriculum-academic-year mappings
  const { data: curriculumAcademicYears } = useQuery({
    queryKey: ['curriculum-academic-years'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_academic_years').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch instrumen penilaian
  const { data: instrumenList } = useQuery({
    queryKey: ['instrumen-penilaian'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_min');
      if (error) throw error;
      return data as InstrumenPenilaian[];
    },
  });

  // Fetch app settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data.forEach((s: AppSetting) => {
        settingsMap[s.setting_key] = s.setting_value || '';
      });
      
      setAppName(settingsMap['app_name'] || 'Tracker PBA');
      setAppTitle(settingsMap['app_title'] || 'Student Achievement Tracker');
      setAppTagline(settingsMap['app_tagline'] || 'Pantau dan kelola nilai mahasiswa Program Bahasa Arab dengan mudah. Visualisasi data yang jelas untuk hasil pembelajaran yang lebih baik.');
      setFooterText(settingsMap['footer_text'] || '© 2024 Student Achievement Tracker PBA. Semua hak dilindungi.');
      setEnableTutorial(settingsMap['enable_tutorial'] !== 'false');
      setLogoUrl(settingsMap['logo_url'] || '');
      setPrimaryColor(settingsMap['primary_color'] || '');
      setAiApiKey(settingsMap['ai_api_key'] || '');
      setAiProvider(settingsMap['ai_provider'] || 'gemini');
      
      // Load prompts
      const promptSettings: Record<string, string> = {};
      Object.keys(settingsMap).filter(key => key.startsWith('prompt_')).forEach(key => {
        promptSettings[key] = settingsMap[key];
      });
      setPrompts(promptSettings);
      
      return settingsMap;
    },
  });

  // Check AI connection status on mount
  const checkAiConnection = useCallback(async () => {
    // Avoid hammering the AI endpoint when the user refreshes/navigates quickly
    const lastCheck = Number(localStorage.getItem('ai_connection_last_check') || '0');
    const now = Date.now();
    if (now - lastCheck < 60_000) {
      return;
    }
    localStorage.setItem('ai_connection_last_check', String(now));

    setAiConnectionStatus('checking');
    try {
      const { data, error } = await supabase.functions.invoke('elearning-ai', {
        body: {
          type: 'generate_material',
          topic: 'Test koneksi',
          context: 'Test singkat untuk cek status koneksi AI.'
        }
      });

      if (error || (data as any)?.error) {
        setAiConnectionStatus('error');
      } else if ((data as any)?.content) {
        setAiConnectionStatus('connected');
      } else {
        setAiConnectionStatus('error');
      }
    } catch {
      setAiConnectionStatus('error');
    }
  }, []);

  useEffect(() => {
    if (settings && role === 'admin') {
      checkAiConnection();
    }
  }, [settings, role, checkAiConnection]);


  const createCurriculumMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase.from('curricula').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil ditambahkan' });
      resetCurriculumForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateCurriculumMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Curriculum> & { id: string }) => {
      const { error } = await supabase.from('curricula').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil diperbarui' });
      resetCurriculumForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCurriculumMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curricula').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Program mutations
  const createProgramMutation = useMutation({
    mutationFn: async (data: { code?: string; name: string; description?: string }) => {
      const { error } = await supabase.from('programs').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil ditambahkan' });
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Program> & { id: string }) => {
      const { error } = await supabase.from('programs').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil diperbarui' });
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Instrumen mutations
  const createInstrumenMutation = useMutation({
    mutationFn: async (data: { rentang_min: number; rentang_max: number; predikat: string; color?: string }) => {
      const { error } = await supabase.from('instrumen_penilaian').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instrumen-penilaian'] });
      toast({ title: 'Berhasil', description: 'Instrumen penilaian berhasil ditambahkan' });
      resetInstrumenForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateInstrumenMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InstrumenPenilaian> & { id: string }) => {
      const { error } = await supabase.from('instrumen_penilaian').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instrumen-penilaian'] });
      toast({ title: 'Berhasil', description: 'Instrumen penilaian berhasil diperbarui' });
      resetInstrumenForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteInstrumenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instrumen_penilaian').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instrumen-penilaian'] });
      toast({ title: 'Berhasil', description: 'Instrumen penilaian berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Settings mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast({ title: 'Berhasil', description: 'Pengaturan berhasil disimpan' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const handleLogoUpload = async () => {
    const input = document.getElementById('logo-upload') as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `app/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Gagal upload', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Add cache busting
    setLogoUrl(newUrl);
    setLogoPreview(null);
    updateSettingMutation.mutate({ key: 'logo_url', value: newUrl });
    setUploading(false);
  };

  const handleCancelLogoPreview = () => {
    setLogoPreview(null);
    const input = document.getElementById('logo-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const resetCurriculumForm = () => {
    setCurriculumName('');
    setCurriculumDescription('');
    setCurriculumAcademicYearIds([]);
    setEditingCurriculum(null);
    setShowCurriculumDialog(false);
  };

  const resetAcademicYearForm = () => {
    setAcademicYearName('');
    setEditingAcademicYear(null);
    setShowAcademicYearDialog(false);
  };

  const resetProgramForm = () => {
    setProgramCode('');
    setProgramName('');
    setProgramDescription('');
    setEditingProgram(null);
    setShowProgramDialog(false);
  };

  const resetInstrumenForm = () => {
    setInstrumenMin('');
    setInstrumenMax('');
    setInstrumenPredikat('');
    setInstrumenColor('#22c55e');
    setEditingInstrumen(null);
    setShowInstrumenDialog(false);
  };

  const openEditInstrumen = (instrumen: InstrumenPenilaian) => {
    setEditingInstrumen(instrumen);
    setInstrumenMin(instrumen.rentang_min.toString());
    setInstrumenMax(instrumen.rentang_max.toString());
    setInstrumenPredikat(instrumen.predikat);
    setInstrumenColor(instrumen.color || '#22c55e');
    setShowInstrumenDialog(true);
  };

  const handleSaveInstrumen = () => {
    const min = parseInt(instrumenMin);
    const max = parseInt(instrumenMax);
    if (isNaN(min) || isNaN(max)) {
      toast({ title: 'Gagal', description: 'Rentang harus berupa angka', variant: 'destructive' });
      return;
    }
    if (min > max) {
      toast({ title: 'Gagal', description: 'Rentang minimal tidak boleh lebih besar dari rentang maksimal', variant: 'destructive' });
      return;
    }
    if (editingInstrumen) {
      updateInstrumenMutation.mutate({ id: editingInstrumen.id, rentang_min: min, rentang_max: max, predikat: instrumenPredikat, color: instrumenColor });
    } else {
      createInstrumenMutation.mutate({ rentang_min: min, rentang_max: max, predikat: instrumenPredikat, color: instrumenColor });
    }
  };

  const openEditCurriculum = (curriculum: Curriculum) => {
    setEditingCurriculum(curriculum);
    setCurriculumName(curriculum.name);
    setCurriculumDescription(curriculum.description || '');
    // Load linked academic year IDs
    const linkedIds = curriculumAcademicYears?.filter(ca => ca.curriculum_id === curriculum.id).map(ca => ca.academic_year_id) || [];
    setCurriculumAcademicYearIds(linkedIds);
    setShowCurriculumDialog(true);
  };

  const openEditProgram = (program: Program) => {
    setEditingProgram(program);
    setProgramCode(program.code || '');
    setProgramName(program.name);
    setProgramDescription(program.description || '');
    setShowProgramDialog(true);
  };

  const handleSaveCurriculum = async () => {
    if (editingCurriculum) {
      await updateCurriculumMutation.mutateAsync({ id: editingCurriculum.id, name: curriculumName, description: curriculumDescription || undefined });
      // Update academic year links
      await supabase.from('curriculum_academic_years').delete().eq('curriculum_id', editingCurriculum.id);
      if (curriculumAcademicYearIds.length > 0) {
        await supabase.from('curriculum_academic_years').insert(
          curriculumAcademicYearIds.map(ayId => ({ curriculum_id: editingCurriculum.id, academic_year_id: ayId }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['curriculum-academic-years'] });
    } else {
      const { data: newCurr, error } = await supabase.from('curricula').insert([{ name: curriculumName, description: curriculumDescription || undefined }]).select().single();
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
      if (newCurr && curriculumAcademicYearIds.length > 0) {
        await supabase.from('curriculum_academic_years').insert(
          curriculumAcademicYearIds.map(ayId => ({ curriculum_id: newCurr.id, academic_year_id: ayId }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum-academic-years'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil ditambahkan' });
    }
    resetCurriculumForm();
  };

  // Academic Year handlers
  const handleSaveAcademicYear = async () => {
    if (editingAcademicYear) {
      const { error } = await supabase.from('academic_years').update({ name: academicYearName }).eq('id', editingAcademicYear.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Berhasil', description: 'Tahun akademik berhasil diperbarui' });
    } else {
      const { error } = await supabase.from('academic_years').insert([{ name: academicYearName }]);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Berhasil', description: 'Tahun akademik berhasil ditambahkan' });
    }
    queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    resetAcademicYearForm();
  };

  const openEditAcademicYear = (ay: any) => {
    setEditingAcademicYear(ay);
    setAcademicYearName(ay.name);
    setShowAcademicYearDialog(true);
  };

  const handleDeleteAcademicYear = async (id: string) => {
    const { error } = await supabase.from('academic_years').delete().eq('id', id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    toast({ title: 'Berhasil', description: 'Tahun akademik berhasil dihapus' });
  };

  const handleToggleAcademicYear = async (id: string, isActive: boolean) => {
const { error } = await supabase.from('academic_years').update({ is_active: isActive }).eq('id', id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['academic-years'] });
  };

  // Semester handlers
  const handleSaveSemester = async () => {
    const orderIdx = parseInt(semesterOrder) || 0;
    const maxSks = parseInt(semesterMaxSks) || 24;
    if (editingSemester) {
      const { error } = await supabase.from('semesters').update({ name: semesterName, order_index: orderIdx, max_sks: maxSks }).eq('id', editingSemester.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Berhasil', description: 'Semester berhasil diperbarui' });
    } else {
      const { error } = await supabase.from('semesters').insert([{ name: semesterName, order_index: orderIdx, max_sks: maxSks }]);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Berhasil', description: 'Semester berhasil ditambahkan' });
    }
    queryClient.invalidateQueries({ queryKey: ['semesters'] });
    resetSemesterForm();
  };

  const openEditSemester = (sem: any) => {
    setEditingSemester(sem);
    setSemesterName(sem.name);
    setSemesterOrder(sem.order_index?.toString() || '0');
    setSemesterMaxSks(sem.max_sks?.toString() || '24');
    setShowSemesterDialog(true);
  };

  const resetSemesterForm = () => {
    setSemesterName('');
    setSemesterOrder('');
    setSemesterMaxSks('24');
    setEditingSemester(null);
    setShowSemesterDialog(false);
  };

  const handleDeleteSemester = async (id: string) => {
    const { error } = await supabase.from('semesters').delete().eq('id', id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['semesters'] });
    toast({ title: 'Berhasil', description: 'Semester berhasil dihapus' });
  };

  const handleToggleSemester = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('semesters').update({ is_active: isActive }).eq('id', id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['semesters'] });
  };

  const handleSaveProgram = () => {
    if (editingProgram) {
      updateProgramMutation.mutate({ id: editingProgram.id, code: programCode || undefined, name: programName, description: programDescription || undefined });
    } else {
      createProgramMutation.mutate({ code: programCode || undefined, name: programName, description: programDescription || undefined });
    }
  };

  const handleSaveAllTexts = async () => {
    await updateSettingMutation.mutateAsync({ key: 'app_name', value: appName });
    await updateSettingMutation.mutateAsync({ key: 'app_title', value: appTitle });
    await updateSettingMutation.mutateAsync({ key: 'app_tagline', value: appTagline });
    await updateSettingMutation.mutateAsync({ key: 'footer_text', value: footerText });
    await updateSettingMutation.mutateAsync({ key: 'enable_tutorial', value: enableTutorial ? 'true' : 'false' });
  };

  const handleSaveAiSettings = async () => {
    await updateSettingMutation.mutateAsync({ key: 'ai_api_key', value: aiApiKey });
    await updateSettingMutation.mutateAsync({ key: 'ai_provider', value: aiProvider });
    await updateSettingMutation.mutateAsync({ key: 'use_lovable_gateway', value: 'false' }); // Force disable lovable gateway
  };

  const handleTestAiConnection = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('elearning-ai', {
        body: {
          type: 'generate_material',
          topic: 'Test koneksi AI',
          context: 'Ini adalah test sederhana untuk memastikan AI dapat terhubung dengan baik.'
        }
      });

      if (error) {
        setAiTestResult({
          success: false,
          message: `Gagal terhubung: ${error.message}`
        });
        toast({
          title: 'Koneksi Gagal',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      if (data?.error) {
        setAiTestResult({
          success: false,
          message: `Error dari AI: ${data.error}`
        });
        toast({
          title: 'Koneksi Gagal',
          description: data.error,
          variant: 'destructive'
        });
        return;
      }

      if (data?.content) {
        setAiTestResult({
          success: true,
          message: 'Koneksi berhasil! AI dapat digunakan untuk membuat materi dan quiz.'
        });
        toast({
          title: 'Koneksi Berhasil',
          description: 'AI dapat terhubung dan siap digunakan untuk e-learning.',
        });
      } else {
        setAiTestResult({
          success: false,
          message: 'Response tidak valid dari AI'
        });
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: `Error: ${err.message || 'Unknown error'}`
      });
      toast({
        title: 'Koneksi Gagal',
        description: err.message || 'Terjadi kesalahan saat testing',
        variant: 'destructive'
      });
    } finally {
      setTestingAi(false);
    }
  };

  const handleSavePrompt = async (key: string, value: string) => {
    await updateSettingMutation.mutateAsync({ key, value });
    setPrompts(prev => ({ ...prev, [key]: value }));
  };

  // Default prompts for each field
  const defaultPrompts: Record<string, { label: string; defaultValue: string }> = {
    'prompt_clo_description': { 
      label: 'Deskripsi CPMK/CLO', 
      defaultValue: 'Buatkan rumusan CPMK (Capaian Pembelajaran Mata Kuliah) untuk mata kuliah tingkat universitas. Rumusan harus menggunakan kata kerja operasional yang terukur.' 
    },
    'prompt_llo_description': { 
      label: 'Deskripsi SUB-CPMK/LLO', 
      defaultValue: 'Buatkan rumusan Sub-CPMK (Lesson Learning Outcome) yang spesifik dan terukur. Harus mendukung pencapaian CPMK yang lebih tinggi.' 
    },
    'prompt_assessment_description': { 
      label: 'Deskripsi Tugas/Quiz', 
      defaultValue: 'Buatkan deskripsi tugas atau quiz untuk menilai pencapaian pembelajaran mahasiswa. Sertakan kriteria penilaian yang jelas.' 
    },
    'prompt_bahan_kajian': { 
      label: 'Bahan Kajian', 
      defaultValue: 'Buatkan daftar bahan kajian yang relevan untuk topik pembelajaran ini. Fokus pada konsep-konsep utama yang perlu dipelajari.' 
    },
    'prompt_indikator': { 
      label: 'Indikator Pembelajaran', 
      defaultValue: 'Buatkan indikator pencapaian pembelajaran yang spesifik dan dapat diukur. Gunakan kata kerja operasional sesuai taksonomi Bloom.' 
    },
  };

  if (loading) {
    return <Layout><div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only admin can access settings, sub_admin is NOT allowed
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdmin = role === 'admin';

  const canAccessTheme = isAdmin;

  return (
    <Layout>
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Pengaturan
          </h1>
          <p className="text-muted-foreground">
            Kelola pengaturan aplikasi, kurikulum, dan program studi
          </p>
        </div>

        <Tabs defaultValue={canAccessTheme ? "theme" : "curriculum"} orientation="vertical" className="flex flex-col md:flex-row gap-6">
          <TabsList className="flex md:flex-col h-auto w-full md:w-56 shrink-0 bg-card border rounded-lg p-1">
            {canAccessTheme && (
              <TabsTrigger value="theme" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Palette className="h-4 w-4" />
                <span className="hidden md:inline">Custom Web</span>
                <span className="md:hidden">Web</span>
              </TabsTrigger>
            )}
            {canAccessTheme && (
              <TabsTrigger value="texts" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Type className="h-4 w-4" />
                <span className="hidden md:inline">Teks Aplikasi</span>
                <span className="md:hidden">Teks</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="curriculum" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Kurikulum
            </TabsTrigger>
            <TabsTrigger value="academic-years" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">Tahun Akademik</span>
              <span className="md:hidden">TA</span>
            </TabsTrigger>
            <TabsTrigger value="semesters" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Hash className="h-4 w-4" />
              Semester
            </TabsTrigger>
            <TabsTrigger value="programs" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden md:inline">Program Studi</span>
              <span className="md:hidden">Prodi</span>
            </TabsTrigger>
            <TabsTrigger value="sistem-kuliah" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden md:inline">Sistem Kuliah</span>
              <span className="md:hidden">Sistem</span>
            </TabsTrigger>
            {canAccessTheme && (
              <TabsTrigger value="instrumen" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                Instrumen
              </TabsTrigger>
            )}
            {canAccessTheme && (
              <TabsTrigger value="ai" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="hidden md:inline">AI & Prompts</span>
                <span className="md:hidden">AI</span>
              </TabsTrigger>
            )}
            {canAccessTheme && (
              <TabsTrigger value="permissions" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline">Perizinan Role</span>
                <span className="md:hidden">Role</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1">
            {/* Theme Tab - Only for admin */}
            {canAccessTheme && (
              <TabsContent value="theme" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Kustomisasi Tampilan</CardTitle>
                    <CardDescription>Atur logo aplikasi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Logo Aplikasi</Label>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          {/* Current Logo */}
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-2">Logo Saat Ini</p>
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                            ) : (
                              <div className="h-16 w-16 flex items-center justify-center rounded-lg border bg-muted">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Preview Logo */}
                          {logoPreview && (
                            <>
                              <div className="text-muted-foreground">→</div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-2">Preview Baru</p>
                                <img src={logoPreview} alt="Preview Logo" className="h-16 w-16 object-contain rounded-lg border-2 border-primary" />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor="logo-upload" className="cursor-pointer">
                            <Button variant="outline" asChild disabled={uploading}>
                              <span>{logoPreview ? 'Pilih Logo Lain' : 'Pilih Logo'}</span>
                            </Button>
                          </Label>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoSelect}
                          />
                          {logoPreview && (
                            <>
                              <Button 
                                onClick={handleLogoUpload} 
                                disabled={uploading}
                              >
                                {uploading ? 'Uploading...' : 'Simpan Logo'}
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={handleCancelLogoPreview}
                                disabled={uploading}
                              >
                                Batal
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Logo akan ditampilkan di navbar, halaman login, dan beranda</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Texts Tab - Only for admin */}
            {canAccessTheme && (
              <TabsContent value="texts" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Kustomisasi Teks</CardTitle>
                    <CardDescription>Atur teks yang tampil di aplikasi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Aplikasi (Navbar)</Label>
                        <Input 
                          value={appName} 
                          onChange={(e) => setAppName(e.target.value)} 
                          placeholder="Tracker PBA"
                        />
                        <p className="text-xs text-muted-foreground">Ditampilkan di navbar</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Judul Hero (Beranda)</Label>
                        <Input 
                          value={appTitle} 
                          onChange={(e) => setAppTitle(e.target.value)} 
                          placeholder="Student Achievement Tracker"
                        />
                        <p className="text-xs text-muted-foreground">Ditampilkan sebagai judul besar di halaman beranda</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Tagline (Beranda)</Label>
                        <Textarea 
                          value={appTagline} 
                          onChange={(e) => setAppTagline(e.target.value)} 
                          placeholder="Pantau dan kelola nilai mahasiswa..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">Ditampilkan sebagai deskripsi di bawah judul hero</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Teks Footer</Label>
                        <Input 
                          value={footerText} 
                          onChange={(e) => setFooterText(e.target.value)} 
                          placeholder="© 2024 Student Achievement Tracker PBA. Semua hak dilindungi."
                        />
                        <p className="text-xs text-muted-foreground">Ditampilkan di bagian bawah setiap halaman</p>
                      </div>
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">Bantuan Tutorial</Label>
                          <p className="text-sm text-muted-foreground">
                            Aktifkan tombol chat bantuan tutorial di pojok kanan bawah layar.
                          </p>
                        </div>
                        <Switch
                          checked={enableTutorial}
                          onCheckedChange={setEnableTutorial}
                        />
                      </div>
                      <Button onClick={handleSaveAllTexts}>Simpan Semua Pengaturan</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Curriculum Tab */}
            <TabsContent value="curriculum" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kelola Kurikulum</CardTitle>
                      <CardDescription>Buat dan kelola nama kurikulum</CardDescription>
                    </div>
                    <Dialog open={showCurriculumDialog} onOpenChange={(open) => { if (!open) resetCurriculumForm(); setShowCurriculumDialog(open); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Kurikulum
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingCurriculum ? 'Edit Kurikulum' : 'Tambah Kurikulum Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nama Kurikulum</Label>
                            <Input 
                              value={curriculumName} 
                              onChange={(e) => setCurriculumName(e.target.value)} 
                              placeholder="Contoh: Kurikulum 2024" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Deskripsi (opsional)</Label>
                            <Textarea 
                              value={curriculumDescription} 
                              onChange={(e) => setCurriculumDescription(e.target.value)} 
                              placeholder="Deskripsi kurikulum..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tahun Akademik</Label>
                            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                              {academicYears?.map(ay => (
                                <label key={ay.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                                  <Checkbox
                                    checked={curriculumAcademicYearIds.includes(ay.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setCurriculumAcademicYearIds([...curriculumAcademicYearIds, ay.id]);
                                      } else {
                                        setCurriculumAcademicYearIds(curriculumAcademicYearIds.filter(id => id !== ay.id));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{ay.name}</span>
                                </label>
                              ))}
                              {(!academicYears || academicYears.length === 0) && (
                                <p className="text-xs text-muted-foreground">Belum ada tahun akademik. Buat di tab Tahun Akademik.</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveCurriculum} disabled={!curriculumName}>
                            {editingCurriculum ? 'Simpan' : 'Tambah'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground">No</TableHead>
                        <TableHead className="text-primary-foreground">Nama Kurikulum</TableHead>
                        <TableHead className="text-primary-foreground">Tahun Akademik</TableHead>
                        <TableHead className="text-primary-foreground">Deskripsi</TableHead>
                        <TableHead className="w-20 text-primary-foreground text-center">Aktif</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {curricula?.map((curriculum, index) => {
                        const linkedAYs = curriculumAcademicYears?.filter(ca => ca.curriculum_id === curriculum.id) || [];
                        const ayNames = linkedAYs.map(ca => academicYears?.find(ay => ay.id === ca.academic_year_id)?.name).filter(Boolean);
                        return (
                          <TableRow key={curriculum.id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>
                              <Badge variant={curriculum.is_active ? "secondary" : "outline"} className={!curriculum.is_active ? "opacity-50" : ""}>
                                {curriculum.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {ayNames.length > 0 ? ayNames.map((name, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                                )) : <span className="text-muted-foreground text-sm">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{curriculum.description || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Switch 
                                checked={curriculum.is_active}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    const confirmDeactivate = window.confirm(
                                      "Menonaktifkan kurikulum akan menyebabkan semua Mata Kuliah dan Daftar Kelas terkait masuk ke mode Arsip (Read-Only). Anda tetap bisa melihat dan mengekspor data. Lanjutkan?"
                                    );
                                    if (!confirmDeactivate) return;
                                  }
                                  updateCurriculumMutation.mutate({ id: curriculum.id, is_active: checked });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditCurriculum(curriculum)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteCurriculumMutation.mutate(curriculum.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!curricula || curricula.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Belum ada kurikulum. Klik "Tambah Kurikulum" untuk menambahkan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* VMTS Visibility Toggle */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Pengaturan Visibilitas VMTS</CardTitle>
                      <CardDescription>Atur bagian VMTS mana saja yang akan ditampilkan di halaman Kurikulum</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                        <div>
                          <p className="font-medium text-base">Tampilkan Tab VMTS UPPS</p>
                          <p className="text-sm text-muted-foreground">Aktifkan untuk menampilkan tab VMTS UPPS secara keseluruhan</p>
                        </div>
                        <Switch
                          checked={settings?.['show_vmts_upps'] !== 'false'}
                          onCheckedChange={(checked) => {
                            updateSettingMutation.mutate({ key: 'show_vmts_upps', value: checked ? 'true' : 'false' });
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Level PT */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-base border-b pb-2">{getVmtsAcronym('pt', settings || {})} PT</h3>
                          {[
                            { key: 'show_vmts_pt_visi', label: 'Visi PT' },
                            { key: 'show_vmts_pt_misi', label: 'Misi PT' },
                            { key: 'show_vmts_pt_tujuan', label: 'Tujuan PT' },
                            { key: 'show_vmts_pt_strategi', label: 'Strategi PT' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between">
                              <span className="text-sm">{item.label}</span>
                              <Switch
                                checked={settings?.[item.key] !== 'false'}
                                onCheckedChange={(checked) => {
                                  updateSettingMutation.mutate({ key: item.key, value: checked ? 'true' : 'false' });
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Level UPPS */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-base border-b pb-2">{getVmtsAcronym('upps', settings || {})} UPPS</h3>
                          {[
                            { key: 'show_vmts_upps_visi', label: 'Visi UPPS' },
                            { key: 'show_vmts_upps_misi', label: 'Misi UPPS' },
                            { key: 'show_vmts_upps_tujuan', label: 'Tujuan UPPS' },
                            { key: 'show_vmts_upps_strategi', label: 'Strategi UPPS' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between">
                              <span className="text-sm">{item.label}</span>
                              <Switch
                                checked={settings?.[item.key] !== 'false'}
                                onCheckedChange={(checked) => {
                                  updateSettingMutation.mutate({ key: item.key, value: checked ? 'true' : 'false' });
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Level PS */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-base border-b pb-2">{getVmtsAcronym('ps', settings || {})} PS</h3>
                          {[
                            { key: 'show_vmts_ps_visi', label: 'Visi PS' },
                            { key: 'show_vmts_ps_misi', label: 'Misi PS' },
                            { key: 'show_vmts_ps_tujuan', label: 'Tujuan PS' },
                            { key: 'show_vmts_ps_strategi', label: 'Strategi PS' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between">
                              <span className="text-sm">{item.label}</span>
                              <Switch
                                checked={settings?.[item.key] !== 'false'}
                                onCheckedChange={(checked) => {
                                  updateSettingMutation.mutate({ key: item.key, value: checked ? 'true' : 'false' });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Academic Years Tab */}
            <TabsContent value="academic-years" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kelola Tahun Akademik</CardTitle>
                      <CardDescription>Buat dan kelola tahun akademik</CardDescription>
                    </div>
                    <Dialog open={showAcademicYearDialog} onOpenChange={(open) => { if (!open) resetAcademicYearForm(); setShowAcademicYearDialog(open); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Tahun Akademik
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingAcademicYear ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nama Tahun Akademik</Label>
                            <Input 
                              value={academicYearName} 
                              onChange={(e) => setAcademicYearName(e.target.value)} 
                              placeholder="Contoh: 2024/2025" 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveAcademicYear} disabled={!academicYearName}>
                            {editingAcademicYear ? 'Simpan' : 'Tambah'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground">No</TableHead>
                        <TableHead className="text-primary-foreground">Nama Tahun Akademik</TableHead>
                        <TableHead className="w-20 text-primary-foreground text-center">Aktif</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicYears?.map((ay, index) => (
                        <TableRow key={ay.id}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant={ay.is_active ? "secondary" : "outline"} className={!ay.is_active ? "opacity-50" : ""}>
                              {ay.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch 
                              checked={ay.is_active}
                              onCheckedChange={(checked) => handleToggleAcademicYear(ay.id, checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditAcademicYear(ay)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAcademicYear(ay.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!academicYears || academicYears.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Belum ada tahun akademik. Klik "Tambah Tahun Akademik" untuk menambahkan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Semesters Tab */}
            <TabsContent value="semesters" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Siklus Semester Aktif</CardTitle>
                  <CardDescription>
                    Pilih siklus semester yang aktif saat ini. Pengaturan ini akan menyaring secara otomatis daftar mata kuliah dan kelas e-learning yang muncul di seluruh sistem.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 max-w-sm">
                    <Label htmlFor="active_semester_type">Semester Aktif Default</Label>
                    <Select
                      value={appSettings?.active_semester_type || 'all'}
                      onValueChange={(val) => updateAppSetting.mutate({ key: 'active_semester_type', value: val })}
                      disabled={updateAppSetting.isPending}
                    >
                      <SelectTrigger id="active_semester_type">
                        <SelectValue placeholder="Pilih Siklus..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Semester</SelectItem>
                        <SelectItem value="ganjil">Semester Ganjil</SelectItem>
                        <SelectItem value="genap">Semester Genap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kelola Semester</CardTitle>
                      <CardDescription>Buat dan kelola semester. Semester yang aktif akan ditampilkan di halaman Mata Kuliah.</CardDescription>
                    </div>
                    <Dialog open={showSemesterDialog} onOpenChange={(open) => { if (!open) resetSemesterForm(); setShowSemesterDialog(open); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Semester
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingSemester ? 'Edit Semester' : 'Tambah Semester Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nama Semester</Label>
                            <Input 
                              value={semesterName} 
                              onChange={(e) => setSemesterName(e.target.value)} 
                              placeholder="Contoh: Semester 1" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Urutan</Label>
                            <Input 
                              type="number"
                              value={semesterOrder} 
                              onChange={(e) => setSemesterOrder(e.target.value)} 
                              placeholder="0" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Jumlah SKS</Label>
                            <Input 
                              type="number"
                              value={semesterMaxSks} 
                              onChange={(e) => setSemesterMaxSks(e.target.value)} 
                              placeholder="24" 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveSemester} disabled={!semesterName}>
                            {editingSemester ? 'Simpan' : 'Tambah'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground">No</TableHead>
                        <TableHead className="text-primary-foreground">Nama Semester</TableHead>
                        <TableHead className="text-primary-foreground">Urutan</TableHead>
                        <TableHead className="w-20 text-primary-foreground text-center">Aktif</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semesters?.map((sem, index) => (
                        <TableRow key={sem.id}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant={sem.is_active ? "secondary" : "outline"} className={!sem.is_active ? "opacity-50" : ""}>
                              {sem.name}
                            </Badge>
                          </TableCell>
                          <TableCell>{sem.max_sks || 24}</TableCell>
                          <TableCell>{sem.order_index}</TableCell>
                          <TableCell className="text-center">
                            <Switch 
                              checked={sem.is_active}
                              onCheckedChange={(checked) => handleToggleSemester(sem.id, checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditSemester(sem)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteSemester(sem.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!semesters || semesters.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada semester. Klik "Tambah Semester" untuk menambahkan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Programs Tab */}
            <TabsContent value="programs" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kelola Program Studi</CardTitle>
                      <CardDescription>Buat dan kelola nama program studi</CardDescription>
                    </div>
                    <Dialog open={showProgramDialog} onOpenChange={(open) => { if (!open) resetProgramForm(); setShowProgramDialog(open); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Prodi
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingProgram ? 'Edit Program Studi' : 'Tambah Program Studi Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Kode Prodi</Label>
                            <Input 
                              value={programCode} 
                              onChange={(e) => setProgramCode(e.target.value)} 
                              placeholder="Contoh: PBA" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nama Program Studi</Label>
                            <Input 
                              value={programName} 
                              onChange={(e) => setProgramName(e.target.value)} 
                              placeholder="Contoh: Pendidikan Bahasa Arab" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Deskripsi (opsional)</Label>
                            <Textarea 
                              value={programDescription} 
                              onChange={(e) => setProgramDescription(e.target.value)} 
                              placeholder="Deskripsi program studi..."
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveProgram} disabled={!programName}>
                            {editingProgram ? 'Simpan' : 'Tambah'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground">No</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Kode</TableHead>
                        <TableHead className="text-primary-foreground">Nama Program Studi</TableHead>
                        <TableHead className="text-primary-foreground">Deskripsi</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programs?.map((program, index) => (
                        <TableRow key={program.id}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{program.code || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{program.name}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{program.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditProgram(program)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteProgramMutation.mutate(program.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!programs || programs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada program studi. Klik "Tambah Prodi" untuk menambahkan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sistem Kuliah Tab */}
            <TabsContent value="sistem-kuliah" className="mt-0">
              <SistemKuliahManager />
            </TabsContent>

            {/* AI & Prompts Tab - Only for admin */}
            {canAccessTheme && (
              <TabsContent value="ai" className="mt-0 space-y-6">
                {/* API Key Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="h-5 w-5" />
                          API Key AI
                        </CardTitle>
                        <CardDescription>Konfigurasi API Key untuk integrasi AI yang membantu generate data</CardDescription>
                      </div>
                      {/* AI Connection Status Indicator */}
                      <div className="flex items-center gap-2">
                        {aiConnectionStatus === 'checking' && (
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">Memeriksa...</span>
                          </Badge>
                        )}
                        {aiConnectionStatus === 'connected' && (
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 border-green-500 bg-green-50 dark:bg-green-950/30">
                            <Wifi className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300 text-xs font-medium">Terhubung</span>
                          </Badge>
                        )}
                        {aiConnectionStatus === 'error' && (
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 border-red-500 bg-red-50 dark:bg-red-950/30">
                            <WifiOff className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-300 text-xs font-medium">Tidak Terhubung</span>
                          </Badge>
                        )}
                        {aiConnectionStatus === 'idle' && (
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
                            <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">Belum Diperiksa</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Provider AI</Label>
                      <Select value={aiProvider} onValueChange={setAiProvider}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI GPT</SelectItem>
                          <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type={showApiKey ? 'text' : 'password'}
                            value={aiApiKey} 
                            onChange={(e) => setAiApiKey(e.target.value)} 
                            placeholder={aiProvider === 'gemini' ? 'AIza...' : aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button onClick={handleSaveAiSettings}>Simpan Konfigurasi AI</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        API Key digunakan untuk mengakses AI yang membantu generate deskripsi CPMK, LLO, dan lainnya.
                      </p>
                    </div>

                    {/* AI Connection Test */}
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Test Koneksi AI E-Learning</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Test apakah AI dapat terhubung dan digunakan untuk membuat materi atau quiz
                          </p>
                        </div>
                        <Button 
                          onClick={handleTestAiConnection} 
                          disabled={testingAi}
                          variant="outline"
                          className="min-w-32"
                        >
                          {testingAi ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Test Koneksi
                            </>
                          )}
                        </Button>
                      </div>

                      {aiTestResult && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${
                          aiTestResult.success 
                            ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900' 
                            : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900'
                        }`}>
                          {aiTestResult.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`font-medium ${
                              aiTestResult.success 
                                ? 'text-green-800 dark:text-green-200' 
                                : 'text-red-800 dark:text-red-200'
                            }`}>
                              {aiTestResult.success ? 'Berhasil!' : 'Gagal'}
                            </p>
                            <p className={`text-sm mt-0.5 ${
                              aiTestResult.success 
                                ? 'text-green-700 dark:text-green-300' 
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {aiTestResult.message}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Prompts Editor Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Editor Prompt AI
                    </CardTitle>
                    <CardDescription>Kustomisasi prompt yang digunakan AI untuk generate setiap field</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(defaultPrompts).map(([key, { label, defaultValue }]) => (
                      <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <Textarea 
                          value={prompts[key] || defaultValue}
                          onChange={(e) => setPrompts(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={3}
                          placeholder={defaultValue}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            Prompt ini digunakan saat AI generate {label.toLowerCase()}
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSavePrompt(key, prompts[key] || defaultValue)}
                          >
                            Simpan Prompt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Instrumen Tab - Only for admin */}
            {canAccessTheme && (
              <TabsContent value="instrumen" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Instrumen Penilaian</CardTitle>
                        <CardDescription>Atur rentang nilai dan predikat untuk penilaian mahasiswa. Rentang nilai berupa bilangan bulat (0-100).</CardDescription>
                      </div>
                      <Dialog open={showInstrumenDialog} onOpenChange={(open) => { if (!open) resetInstrumenForm(); setShowInstrumenDialog(open); }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Instrumen
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingInstrumen ? 'Edit Instrumen' : 'Tambah Instrumen Baru'}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Rentang Minimal</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100"
                                  value={instrumenMin} 
                                  onChange={(e) => setInstrumenMin(e.target.value)} 
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Rentang Maksimal</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100"
                                  value={instrumenMax} 
                                  onChange={(e) => setInstrumenMax(e.target.value)} 
                                  placeholder="100"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Predikat</Label>
                                <Input 
                                  value={instrumenPredikat} 
                                  onChange={(e) => setInstrumenPredikat(e.target.value)} 
                                  placeholder="Contoh: A, B, C, Sangat Baik, dll."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Warna Predikat</Label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={instrumenColor} 
                                    onChange={(e) => setInstrumenColor(e.target.value)}
                                    className="w-10 h-10 rounded border cursor-pointer"
                                  />
                                  <Input 
                                    value={instrumenColor} 
                                    onChange={(e) => setInstrumenColor(e.target.value)}
                                    placeholder="#22c55e"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleSaveInstrumen} disabled={!instrumenMin || !instrumenMax || !instrumenPredikat}>
                              {editingInstrumen ? 'Simpan' : 'Tambah'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {instrumenList && instrumenList.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead>Rentang Minimal</TableHead>
                            <TableHead>Rentang Maksimal</TableHead>
                            <TableHead>Predikat</TableHead>
                            <TableHead>Warna</TableHead>
                            <TableHead className="w-24">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {instrumenList.map((instrumen, index) => (
                            <TableRow key={instrumen.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{instrumen.rentang_min}</TableCell>
                              <TableCell>{instrumen.rentang_max}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="secondary"
                                  style={{ 
                                    backgroundColor: instrumen.color || undefined,
                                    color: instrumen.color ? '#fff' : undefined
                                  }}
                                >
                                  {instrumen.predikat}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div 
                                  className="w-6 h-6 rounded border"
                                  style={{ backgroundColor: instrumen.color || '#888' }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditInstrumen(instrumen)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteInstrumenMutation.mutate(instrumen.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Belum ada instrumen penilaian. Klik "Tambah Instrumen" untuk menambahkan.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Permissions Tab - Only for admin */}
            {canAccessTheme && (
              <TabsContent value="permissions" className="mt-0">
                <ErrorBoundary>
                  <RolePermissionsTab />
                </ErrorBoundary>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
