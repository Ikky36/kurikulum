import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import {
  useTaRubricsConfig,
  TaRubricCriterion,
  TaRubricConfig,
  calculateRubricTotalWeight,
  calculateExaminerScore,
  determineGradeFromScore,
  defaultTaRubrics,
} from '@/lib/taAssessmentTypes';
import {
  GraduationCap,
  FileCheck,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const TaRubricManagerCard: React.FC = () => {
  const { rubrics, isLoading, isSaving, saveRubrics, resetToDefault } = useTaRubricsConfig();

  const [activeTab, setActiveTab] = useState<'sempro' | 'sidang'>('sempro');
  const [localRubrics, setLocalRubrics] = useState(rubrics);
  const [isDirty, setIsDirty] = useState(false);

  // Sync from query data when loaded or updated
  useEffect(() => {
    if (rubrics) {
      setLocalRubrics(rubrics);
      setIsDirty(false);
    }
  }, [rubrics]);

  const currentRubric: TaRubricConfig = localRubrics[activeTab] || defaultTaRubrics[activeTab];
  const criteria = currentRubric.criteria || [];
  const totalWeight = calculateRubricTotalWeight(criteria);
  const isWeightValid = totalWeight === 100;

  // Criterion Add / Edit Modal state
  const [isCriterionDialogOpen, setIsCriterionDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<TaRubricCriterion | null>(null);
  const [critName, setCritName] = useState('');
  const [critDesc, setCritDesc] = useState('');
  const [critWeight, setCritWeight] = useState(25);

  // Live Simulator state
  const [showSimulator, setShowSimulator] = useState(true);
  const [simScores, setSimScores] = useState<Record<string, number>>({});

  // Initialize simulator scores to 80 whenever criteria change
  useEffect(() => {
    const initial: Record<string, number> = {};
    criteria.forEach((c) => {
      initial[c.id] = simScores[c.id] ?? 80;
    });
    setSimScores(initial);
  }, [criteria]);

  const simResult = calculateExaminerScore(criteria, simScores);
  const simGrade = determineGradeFromScore(simResult.finalScore, currentRubric.min_passing_score);

  // Handlers for Criterion Modal
  const openAddCriterion = () => {
    setEditingCriterion(null);
    setCritName('');
    setCritDesc('');
    // Suggest remaining weight to reach 100%
    const remaining = Math.max(5, 100 - totalWeight);
    setCritWeight(remaining);
    setIsCriterionDialogOpen(true);
  };

  const openEditCriterion = (crit: TaRubricCriterion) => {
    setEditingCriterion(crit);
    setCritName(crit.name);
    setCritDesc(crit.description || '');
    setCritWeight(crit.weight);
    setIsCriterionDialogOpen(true);
  };

  const handleSaveCriterion = () => {
    if (!critName.trim()) {
      toast.error('Nama kriteria tidak boleh kosong.');
      return;
    }
    if (critWeight <= 0 || critWeight > 100) {
      toast.error('Bobot kriteria harus di antara 1% sampai 100%.');
      return;
    }

    let updatedCriteria: TaRubricCriterion[];

    if (editingCriterion) {
      updatedCriteria = criteria.map((c) =>
        c.id === editingCriterion.id
          ? { ...c, name: critName.trim(), description: critDesc.trim(), weight: Number(critWeight) }
          : c
      );
    } else {
      const newCrit: TaRubricCriterion = {
        id: `${activeTab}_crit_${Date.now()}`,
        name: critName.trim(),
        description: critDesc.trim(),
        weight: Number(critWeight),
        max_score: 100,
        order_index: criteria.length + 1,
      };
      updatedCriteria = [...criteria, newCrit];
    }

    setLocalRubrics((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        criteria: updatedCriteria,
      },
    }));
    setIsDirty(true);
    setIsCriterionDialogOpen(false);
  };

  const handleDeleteCriterion = (id: string) => {
    if (criteria.length <= 1) {
      toast.error('Minimal harus ada 1 kriteria penilaian.');
      return;
    }
    const updated = criteria.filter((c) => c.id !== id);
    setLocalRubrics((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        criteria: updated,
      },
    }));
    setIsDirty(true);
  };

  const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= criteria.length) return;

    const list = [...criteria];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order_index: idx + 1 }));

    setLocalRubrics((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        criteria: reordered,
      },
    }));
    setIsDirty(true);
  };

  const handlePassingScoreChange = (score: number) => {
    const val = Math.min(100, Math.max(0, score));
    setLocalRubrics((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        min_passing_score: val,
      },
    }));
    setIsDirty(true);
  };

  const handleSaveToDb = async () => {
    if (!isWeightValid) {
      toast.error(`Total bobot saat ini ${totalWeight}%. Harus tepat 100% agar dapat disimpan.`);
      return;
    }

    try {
      await saveRubrics(localRubrics);
      setIsDirty(false);
    } catch (e: any) {
      // Error handled by hook toast
    }
  };

  const handleResetDefault = async () => {
    await resetToDefault(activeTab);
    setLocalRubrics((prev) => ({
      ...prev,
      [activeTab]: defaultTaRubrics[activeTab],
    }));
    setIsDirty(false);
    toast.success(`Rubrik ${activeTab === 'sempro' ? 'Seminar Proposal' : 'Sidang Tugas Akhir'} direset ke standar STITMA.`);
  };

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Rubrik Penilaian Seminar & Sidang Tugas Akhir
            </CardTitle>
            <CardDescription>
              Atur komponen kriteria, indikator deskriptif, bobot nilai (total 100%), dan batas kelulusan untuk penguji sempro dan sidang munaqasyah.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Reset Default STITMA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset ke Standar Rubrik STITMA?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Kriteria, deskripsi indikator, dan bobot untuk fase{' '}
                    <strong>{activeTab === 'sempro' ? 'Seminar Proposal' : 'Sidang Tugas Akhir'}</strong> akan dikembalikan
                    ke standar baku kampus STITMA Yogyakarta (4 kriteria, total 100%).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDefault}>Ya, Reset Sekarang</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSaveToDb}
              disabled={isSaving || !isDirty}
              className="gap-2 shadow-sm font-medium"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan Rubrik *' : 'Tersimpan'}
            </Button>
          </div>
        </div>

        {/* Tab Selection: Sempro vs Sidang */}
        <div className="pt-2">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as 'sempro' | 'sidang');
            }}
          >
            <TabsList className="grid grid-cols-2 w-full max-w-md bg-muted/80">
              <TabsTrigger value="sempro" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Seminar Proposal
                <Badge variant="secondary" className="ml-1 text-xs">
                  {localRubrics.sempro?.criteria?.length || 4} Kriteria
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sidang" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Sidang Munaqasyah
                <Badge variant="secondary" className="ml-1 text-xs">
                  {localRubrics.sidang?.criteria?.length || 4} Kriteria
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Banner Status & Passing Score Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-card/60 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Akumulasi Bobot
              </span>
              {isWeightValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${isWeightValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {totalWeight}%
              </span>
              <span className="text-xs text-muted-foreground">/ target 100%</span>
            </div>
            {isWeightValid ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Komposisi bobot sempurna untuk perhitungan nilai otomatis.
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {totalWeight < 100 ? `Kurang ${100 - totalWeight}% lagi.` : `Kelebihan ${totalWeight - 100}%.`} Sesuaikan bobot kriteria.
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl border bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Batas Kelulusan (Passing Grade)
              </span>
              <Badge variant="outline" className="text-xs">
                Skala 0 - 100
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={100}
                value={currentRubric.min_passing_score}
                onChange={(e) => handlePassingScoreChange(Number(e.target.value))}
                className="w-24 text-xl font-bold h-10"
              />
              <div className="text-xs text-muted-foreground leading-tight">
                Skor minimal agar mahasiswa dinyatakan <strong className="text-foreground">Lulus</strong> oleh dewan penguji.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-card/60 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Hak Akses & Penilai
              </span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Sesuai aturan akademik, <strong>hanya Dewan Penguji</strong> yang memberikan nilai rubrik. Ketua Sidang mengesahkan berita acara & memimpin jalannya sidang.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px] font-normal">
                Dosen Tetap (Akun)
              </Badge>
              <Badge variant="outline" className="text-[11px] font-normal">
                Penguji Tamu (Link Token)
              </Badge>
            </div>
          </div>
        </div>

        {/* Warning if weight != 100 */}
        {!isWeightValid && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Total Bobot Penilaian Belum Tepat 100%
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Saat ini jumlah bobot seluruh kriteria adalah <strong>{totalWeight}%</strong>. Pastikan total bobot kriteria berjumlah tepat 100% agar nilai akhir mahasiswa dapat dikalkulasi secara valid dan adil.
              </p>
            </div>
          </div>
        )}

        {/* Table of Criteria */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Daftar Kriteria Penilaian
                <Badge variant="outline" className="text-xs font-normal">
                  {criteria.length} Butir
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Setiap kriteria memiliki bobot persentase yang dinilai oleh penguji dalam skala 0 sampai 100.
              </p>
            </div>

            <Button onClick={openAddCriterion} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Kriteria
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="min-w-[200px]">Nama Kriteria & Aspek yang Dinilai</TableHead>
                  <TableHead className="w-28 text-center">Bobot (%)</TableHead>
                  <TableHead className="w-24 text-center">Skor Maks</TableHead>
                  <TableHead className="w-36 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada kriteria penilaian. Silakan klik &ldquo;Tambah Kriteria&rdquo; atau &ldquo;Reset Default STITMA&rdquo;.
                    </TableCell>
                  </TableRow>
                ) : (
                  criteria.map((crit, index) => (
                    <TableRow key={crit.id} className="hover:bg-muted/30">
                      <TableCell className="text-center font-medium text-muted-foreground text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-semibold text-sm text-foreground">{crit.name}</span>
                          {crit.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {crit.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                          {crit.weight}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {crit.max_score || 100}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={index === 0}
                            onClick={() => handleMoveCriterion(index, 'up')}
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={index === criteria.length - 1}
                            onClick={() => handleMoveCriterion(index, 'down')}
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700"
                            onClick={() => openEditCriterion(crit)}
                            title="Edit Kriteria"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => handleDeleteCriterion(crit.id)}
                            title="Hapus Kriteria"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Live Interactive Simulator Preview */}
        <div className="pt-2">
          <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Simulator Penilaian Penguji (Live Tester)
                    <Badge variant="outline" className="text-[10px] bg-background">
                      Pratinjau Interaktif
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Coba gerakkan slider nilai untuk melihat bagaimana skor dan status kelulusan dihitung secara real-time.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSimulator(!showSimulator)}
                className="text-xs"
              >
                {showSimulator ? 'Sembunyikan' : 'Buka Simulator'}
              </Button>
            </div>

            {showSimulator && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* Sliders */}
                <div className="lg:col-span-2 space-y-4 bg-background p-4 rounded-lg border">
                  {criteria.map((crit) => {
                    const val = simScores[crit.id] ?? 80;
                    const weighted = Math.round((val * (crit.weight / 100)) * 100) / 100;
                    return (
                      <div key={crit.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {crit.name} ({crit.weight}%)
                          </span>
                          <span className="font-semibold text-primary">
                            Skor: {val} &rarr; Bobot: {weighted}
                          </span>
                        </div>
                        <Slider
                          value={[val]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(vals) =>
                            setSimScores((prev) => ({ ...prev, [crit.id]: vals[0] }))
                          }
                          className="py-1"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Live Output Card */}
                <div className="p-4 rounded-lg border bg-background flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-medium text-muted-foreground">Hasil Kalkulasi</span>
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    </div>

                    <div className="text-center py-2">
                      <span className="text-4xl font-extrabold text-foreground tracking-tight">
                        {simResult.finalScore}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">Nilai Akhir Penguji</p>
                    </div>

                    <div className="space-y-1 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
                        <span>Predikat:</span>
                        <span className="text-primary font-bold">{simGrade.grade}</span>
                        <span className="text-muted-foreground">({simGrade.arabicLabel})</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge className={`text-xs px-3 py-1 ${simGrade.badgeClass}`}>
                        {simGrade.statusLabel}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center italic border-t pt-2">
                    Passing Grade: {currentRubric.min_passing_score}. Mahasiswa dinyatakan lulus jika skor &ge; batas kelulusan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Dialog Add / Edit Criterion */}
      <Dialog open={isCriterionDialogOpen} onOpenChange={setIsCriterionDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>
              {editingCriterion ? 'Edit Kriteria Penilaian' : 'Tambah Kriteria Penilaian Baru'}
            </DialogTitle>
            <DialogDescription>
              Tentukan nama aspek, deskripsi indikator yang harus dinilai oleh penguji, serta persentase bobotnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="crit-name">Nama Aspek / Kriteria</Label>
              <Input
                id="crit-name"
                placeholder="Contoh: Metodologi Penelitian & Desain Riset"
                value={critName}
                onChange={(e) => setCritName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="crit-weight">Bobot Penilaian (%)</Label>
                <span className="text-xs text-muted-foreground">Skala 1 - 100%</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="crit-weight"
                  type="number"
                  min={1}
                  max={100}
                  value={critWeight}
                  onChange={(e) => setCritWeight(Number(e.target.value))}
                  className="w-28 text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground">
                  Sisa bobot yang dibutuhkan agar total 100%: <strong>{Math.max(0, 100 - (totalWeight - (editingCriterion?.weight || 0)))}%</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crit-desc">Indikator & Panduan Penilaian untuk Penguji</Label>
              <Textarea
                id="crit-desc"
                rows={4}
                placeholder="Tuliskan panduan atau indikator penilaian yang spesifik, misalnya: Kejelasan rumusan masalah, keabsahan instrumen, kepatuhan metodologi..."
                value={critDesc}
                onChange={(e) => setCritDesc(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Teks ini akan muncul pada formulir penilaian yang dibaca penguji saat mengevaluasi ujian mahasiswa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCriterionDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveCriterion}>
              {editingCriterion ? 'Simpan Perubahan' : 'Tambahkan Kriteria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
export default TaRubricManagerCard;
