import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  AlertCircle,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAType, TAMasterPhase } from '@/lib/types';
import { SubTargetViewer } from './SubTargetViewer';

interface RekapitulasiFaseViewProps {
  scope: 'admin' | 'dosen';
  dosenId?: string;
  className?: string;
}

export function RekapitulasiFaseView({ scope, dosenId, className }: RekapitulasiFaseViewProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);

  // Modal Sub-Target Viewer
  const [selectedStudentForTarget, setSelectedStudentForTarget] = useState<{ id: string; name: string } | null>(null);
  const [isSubTargetOpen, setIsSubTargetOpen] = useState(false);

  // 1. Fetch Master TA Types
  const { data: taTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['ta_rekap_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as TAType[];
    }
  });

  // Set default selected type
  React.useEffect(() => {
    if (taTypes && taTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(taTypes[0].id);
    }
  }, [taTypes, selectedTypeId]);

  // 2. Fetch Master Phases
  const { data: allPhases, isLoading: loadingPhases } = useQuery({
    queryKey: ['ta_rekap_all_phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_master_phases')
        .select('*')
        .order('order_num', { ascending: true });
      if (error) throw error;
      return (data || []) as TAMasterPhase[];
    }
  });

  // 3. Fetch Submissions based on scope
  const { data: submissions = [], isLoading: loadingSubs } = useQuery({
    queryKey: scope === 'dosen' ? ['ta_rekap_subs_dosen', dosenId] : ['ta_rekap_subs_admin'],
    queryFn: async () => {
      if (scope === 'dosen') {
        if (!dosenId) return [];
        const { data, error } = await supabase
          .from('ta_advisors')
          .select(`
            id, role,
            ta_submissions (
              id, title, type_id, status, document_link, current_phase_id, created_at,
              profiles:student_id (id, full_name, nim, program),
              ta_types (id, name),
              current_phase:ta_master_phases (id, name, order_num),
              ta_advisors (id, role, dosen_id, profiles:dosen_id (id, full_name))
            )
          `)
          .eq('dosen_id', dosenId);
        if (error) throw error;

        const subsMap = new Map();
        data?.forEach((adv: any) => {
          if (adv.ta_submissions && !subsMap.has(adv.ta_submissions.id)) {
            subsMap.set(adv.ta_submissions.id, adv.ta_submissions);
          }
        });
        return Array.from(subsMap.values());
      } else {
        const { data, error } = await supabase
          .from('ta_submissions')
          .select(`
            id, title, type_id, status, document_link, current_phase_id, created_at,
            profiles:student_id (id, full_name, nim, program),
            ta_types (id, name),
            current_phase:ta_master_phases (id, name, order_num),
            ta_advisors (id, role, dosen_id, profiles:dosen_id (id, full_name))
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as any[];
      }
    },
    enabled: scope !== 'dosen' || !!dosenId
  });

  // Unique programs for admin filter
  const uniquePrograms = useMemo(() => {
    const progs = new Set<string>();
    submissions.forEach((s: any) => {
      if (s.profiles?.program) progs.add(s.profiles.program);
    });
    return Array.from(progs);
  }, [submissions]);

  // Master phases for currently selected TA type
  const typePhases = useMemo(() => {
    if (!allPhases || !selectedTypeId) return [];
    return allPhases
      .filter((p) => p.ta_type_id === selectedTypeId)
      .sort((a, b) => a.order_num - b.order_num);
  }, [allPhases, selectedTypeId]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub: any) => {
      if (selectedTypeId && sub.type_id !== selectedTypeId) return false;
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (scope === 'admin' && programFilter !== 'all' && sub.profiles?.program !== programFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sub.profiles?.full_name?.toLowerCase().includes(q);
        const matchNim = sub.profiles?.nim?.toLowerCase().includes(q);
        const matchTitle = sub.title?.toLowerCase().includes(q);
        if (!matchName && !matchNim && !matchTitle) return false;
      }
      return true;
    });
  }, [submissions, selectedTypeId, statusFilter, programFilter, scope, searchQuery]);

  // Total students for current selection
  const totalStudents = filteredSubmissions.length;

  // Breakdown per phase
  const phaseBreakdown = useMemo(() => {
    const stats = typePhases.map((phase, idx) => {
      const students = filteredSubmissions.filter((s: any) => s.current_phase_id === phase.id);
      const count = students.length;
      const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      return {
        phase,
        idx,
        count,
        total: totalStudents,
        ratioText: `${count}/${totalStudents}`,
        percentage,
        students
      };
    });

    // Unassigned phase students
    const unassignedStudents = filteredSubmissions.filter((s: any) => {
      return !s.current_phase_id || !typePhases.some((p) => p.id === s.current_phase_id);
    });
    const unassignedCount = unassignedStudents.length;
    const unassignedPercentage = totalStudents > 0 ? Math.round((unassignedCount / totalStudents) * 100) : 0;

    return {
      stats,
      unassigned: {
        count: unassignedCount,
        total: totalStudents,
        ratioText: `${unassignedCount}/${totalStudents}`,
        percentage: unassignedPercentage,
        students: unassignedStudents
      }
    };
  }, [typePhases, filteredSubmissions, totalStudents]);

  // Highlights & KPI Insights
  const busiestPhase = useMemo(() => {
    if (phaseBreakdown.stats.length === 0) return null;
    let max = phaseBreakdown.stats[0];
    for (const st of phaseBreakdown.stats) {
      if (st.count > max.count) max = st;
    }
    return max.count > 0 ? max : null;
  }, [phaseBreakdown.stats]);

  const finalPhase = useMemo(() => {
    if (phaseBreakdown.stats.length === 0) return null;
    return phaseBreakdown.stats[phaseBreakdown.stats.length - 1];
  }, [phaseBreakdown.stats]);

  // Gradient generator for horizontal bars based on phase progress
  const getGradient = (idx: number, total: number) => {
    if (total <= 1) return 'from-blue-600 to-indigo-600';
    const ratio = idx / Math.max(total - 1, 1);
    if (ratio < 0.25) return 'from-sky-500 to-blue-600';
    if (ratio < 0.5) return 'from-blue-600 to-indigo-600';
    if (ratio < 0.75) return 'from-indigo-600 to-violet-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getBorderColor = (idx: number, total: number) => {
    if (total <= 1) return 'border-blue-200 dark:border-blue-900';
    const ratio = idx / Math.max(total - 1, 1);
    if (ratio < 0.25) return 'border-sky-200 dark:border-sky-900';
    if (ratio < 0.5) return 'border-indigo-200 dark:border-indigo-900';
    if (ratio < 0.75) return 'border-violet-200 dark:border-violet-900';
    return 'border-emerald-200 dark:border-emerald-900';
  };

  const isLoading = loadingTypes || loadingPhases || loadingSubs;

  return (
    <div className={cn("space-y-6 animate-slide-up", className)}>
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    Rekapitulasi Progres Fase Tugas Akhir
                    <Badge variant="outline" className="text-xs font-normal">
                      {scope === 'dosen' ? 'Bimbingan Anda' : 'Semua Mahasiswa'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    Distribusi jumlah mahasiswa perfase dalam bentuk diagram batang mendatar.
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* TA Types Segmented Pill Bar */}
            {taTypes && taTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 max-w-full">
                {taTypes.map((t) => {
                  const typeCount = submissions.filter((s: any) => s.type_id === t.id && (statusFilter === 'all' || s.status === statusFilter)).length;
                  const isActive = selectedTypeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTypeId(t.id);
                        setExpandedPhaseId(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      )}
                    >
                      <span>{t.name}</span>
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        className={cn(
                          "text-[10px] h-4.5 px-1.5 py-0 font-semibold",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
                        )}
                      >
                        {typeCount}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub Filters: Search, Status, Prodi (if admin) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2.5 pt-4 mt-2 border-t border-border/60">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / NIM..."
                className="pl-8 text-xs sm:text-sm h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Status Tugas Akhir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Disetujui (Berjalan)</SelectItem>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="revision">Revisi</SelectItem>
              </SelectContent>
            </Select>

            {scope === 'admin' && uniquePrograms.length > 0 && (
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Semua Prodi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Program Studi</SelectItem>
                  {uniquePrograms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-2 space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Total Mahasiswa</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {totalStudents}
              </div>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                Pada jenis {taTypes?.find(t => t.id === selectedTypeId)?.name || 'TA'}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Fase Terpadat</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 truncate">
                {busiestPhase ? `${busiestPhase.count} Mhs` : '0 Mhs'}
              </div>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {busiestPhase ? busiestPhase.phase.name : 'Belum ada data'}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Fase Akhir / Sidang</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {finalPhase ? `${finalPhase.count} Mhs` : '0 Mhs'}
              </div>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {finalPhase ? `${finalPhase.percentage}% dari total` : '0%'}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Master Fase</span>
                <Layers className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {typePhases.length}
              </div>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                Tahapan alur bimbingan
              </span>
            </div>
          </div>

          {/* DIAGRAM BATANG MENDATAR (HORIZONTAL BAR CHART) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Diagram Distribusi Fase
              </h3>
              <span className="text-xs text-muted-foreground">
                Klik kartu fase untuk melihat rincian mahasiswa
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Memuat data rekapitulasi progres...
              </div>
            ) : typePhases.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                Belum ada fase yang dikonfigurasi untuk jenis Tugas Akhir ini.
              </div>
            ) : totalStudents === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                Tidak ada data mahasiswa bimbingan yang sesuai dengan filter yang dipilih.
              </div>
            ) : (
              <div className="space-y-3">
                {phaseBreakdown.stats.map((item) => {
                  const isExpanded = expandedPhaseId === item.phase.id;
                  const isZero = item.count === 0;

                  return (
                    <div
                      key={item.phase.id}
                      className={cn(
                        "rounded-xl border transition-all duration-200 overflow-hidden",
                        isExpanded ? "ring-1 ring-primary/40 shadow-sm bg-card" : "bg-card/70 hover:bg-card hover:border-border",
                        getBorderColor(item.idx, typePhases.length)
                      )}
                    >
                      <div
                        onClick={() => setExpandedPhaseId(isExpanded ? null : item.phase.id)}
                        className="p-3.5 sm:p-4 cursor-pointer select-none space-y-2.5"
                      >
                        {/* Header line: Phase name, ratio (misal 13/50), percentage badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                              {item.idx + 1}
                            </span>
                            <span className="font-semibold text-sm sm:text-base text-foreground truncate">
                              {item.phase.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Format utama yang diminta: "13/50" */}
                            <div className="text-right">
                              <span className="font-bold text-sm sm:text-base text-foreground">
                                {item.ratioText}
                              </span>
                              <span className="text-[11px] sm:text-xs text-muted-foreground ml-1">
                                Mahasiswa
                              </span>
                            </div>

                            <Badge
                              variant={isZero ? "outline" : "secondary"}
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5",
                                !isZero && "bg-primary/10 text-primary border-primary/20"
                              )}
                            >
                              {item.percentage}%
                            </Badge>

                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Elegant Horizontal Bar Track */}
                        <div className="relative w-full bg-muted/60 dark:bg-muted/40 rounded-full h-4 sm:h-5 p-0.5 border border-border/40 overflow-hidden shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out shadow-xs flex items-center justify-end pr-2",
                              getGradient(item.idx, typePhases.length)
                            )}
                            style={{
                              width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%`
                            }}
                          >
                            {item.percentage >= 15 && (
                              <span className="text-[10px] font-bold text-white drop-shadow-xs select-none">
                                {item.percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable student list */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 bg-muted/20 border-t border-border/50 space-y-2.5 animate-in fade-in-50 duration-200">
                          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                            <span className="font-medium">
                              Daftar Mahasiswa di Fase "{item.phase.name}" ({item.count} orang):
                            </span>
                          </div>

                          {item.count === 0 ? (
                            <p className="text-xs italic text-muted-foreground py-2">
                              Saat ini belum ada mahasiswa yang berada di fase ini.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {item.students.map((sub: any) => (
                                <div
                                  key={sub.id}
                                  className="p-3 bg-card border rounded-lg shadow-2xs space-y-1.5 hover:border-primary/40 transition-colors"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                        {sub.profiles?.full_name}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <span>NIM: {sub.profiles?.nim || '-'}</span>
                                        {sub.profiles?.program && (
                                          <span className="text-[10px] uppercase font-medium text-primary">
                                            ({sub.profiles.program})
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[11px] px-2 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudentForTarget({
                                          id: sub.id,
                                          name: sub.profiles?.full_name || 'Mahasiswa'
                                        });
                                        setIsSubTargetOpen(true);
                                      }}
                                    >
                                      Target
                                    </Button>
                                  </div>

                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={sub.title}>
                                    {sub.title}
                                  </p>

                                  <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <div className="truncate max-w-[200px]">
                                      {sub.ta_advisors?.length > 0 ? (
                                        <span>
                                          Pembimbing:{' '}
                                          <span className="text-foreground font-medium">
                                            {sub.ta_advisors.map((a: any) => a.profiles?.full_name).filter(Boolean).join(', ')}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="italic">Belum diplot</span>
                                      )}
                                    </div>

                                    {sub.document_link && (
                                      <a
                                        href={sub.document_link.startsWith('http') ? sub.document_link : `https://${sub.document_link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1 text-[11px]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-3 h-3" /> Draft
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Khusus Mahasiswa yang Belum Memiliki / Memulai Fase */}
                {phaseBreakdown.unassigned.count > 0 && (
                  <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden">
                    <div
                      onClick={() => setExpandedPhaseId(expandedPhaseId === 'unassigned' ? null : 'unassigned')}
                      className="p-3.5 sm:p-4 cursor-pointer select-none space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 shrink-0 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center">
                            ?
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-200 truncate">
                            Belum Ditentukan / Memulai Fase
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                              {phaseBreakdown.unassigned.ratioText}
                            </span>
                            <span className="text-[11px] sm:text-xs text-muted-foreground ml-1">
                              Mahasiswa
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-amber-400 text-amber-700 dark:text-amber-300">
                            {phaseBreakdown.unassigned.percentage}%
                          </Badge>

                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                            {expandedPhaseId === 'unassigned' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="relative w-full bg-muted/60 dark:bg-muted/40 rounded-full h-4 sm:h-5 p-0.5 border border-border/40 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700 ease-out shadow-xs"
                          style={{
                            width: `${Math.max(phaseBreakdown.unassigned.percentage, 3)}%`
                          }}
                        />
                      </div>
                    </div>

                    {expandedPhaseId === 'unassigned' && (
                      <div className="p-3 sm:p-4 bg-background/60 border-t border-amber-200 dark:border-amber-900 space-y-2.5">
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                          Daftar mahasiswa yang belum memiliki fase aktif ({phaseBreakdown.unassigned.count} orang):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {phaseBreakdown.unassigned.students.map((sub: any) => (
                            <div key={sub.id} className="p-3 bg-card border rounded-lg shadow-2xs space-y-1">
                              <p className="font-semibold text-xs text-foreground truncate">{sub.profiles?.full_name}</p>
                              <p className="text-[11px] text-muted-foreground">NIM: {sub.profiles?.nim || '-'}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{sub.title}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub Target Viewer Modal */}
      {selectedStudentForTarget && (
        <SubTargetViewer
          isOpen={isSubTargetOpen}
          setIsOpen={setIsSubTargetOpen}
          submissionId={selectedStudentForTarget.id}
          studentName={selectedStudentForTarget.name}
        />
      )}
    </div>
  );
}
