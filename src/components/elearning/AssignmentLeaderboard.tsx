import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, Crown, TrendingUp, Users, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignmentLeaderboardProps {
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
}

interface LeaderboardEntry {
  rank: number;
  student_profile_id: string;
  full_name: string;
  nim: string | null;
  photo_url: string | null;
  best_score: number | null;
  attempts: number;
  submitted_at: string | null;
  has_submitted: boolean;
}

export function AssignmentLeaderboard({ assignmentId, assignmentTitle, classId }: AssignmentLeaderboardProps) {
  const [open, setOpen] = useState(false);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['assignment-leaderboard', assignmentId, classId],
    queryFn: async () => {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_assignment_leaderboard', {
          p_assignment_id: assignmentId,
          p_class_id: classId
        });

      if (rpcError) throw rpcError;

      // Map the RPC data to LeaderboardEntry
      const entries: LeaderboardEntry[] = (rpcData || []).map((row: any) => ({
        rank: 0,
        student_profile_id: row.student_profile_id,
        full_name: row.full_name,
        nim: row.nim,
        photo_url: row.photo_url,
        best_score: row.best_score,
        attempts: row.attempts,
        submitted_at: row.submitted_at,
        has_submitted: row.attempts > 0,
      }));

      // Sort: submitted students first by score descending, then non-submitted alphabetically
      const sorted = entries.sort((a, b) => {
        if (a.has_submitted && !b.has_submitted) return -1;
        if (!a.has_submitted && b.has_submitted) return 1;
        if (a.has_submitted && b.has_submitted) {
          return (b.best_score ?? 0) - (a.best_score ?? 0);
        }
        return a.full_name.localeCompare(b.full_name);
      });

      // Assign ranks only to submitted students
      let rank = 1;
      sorted.forEach((entry) => {
        if (entry.has_submitted) {
          entry.rank = rank++;
        }
      });

      return sorted;
    },
    enabled: open,
  });

  const totalCount = leaderboard?.length || 0;
  const submittedCount = leaderboard?.filter(e => e.has_submitted).length || 0;

  const getRankIcon = (rank: number, hasSubmitted: boolean) => {
    if (!hasSubmitted) {
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    }
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number, hasSubmitted: boolean) => {
    if (!hasSubmitted) {
      return 'bg-muted/30 border-border opacity-60';
    }
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-card border-border';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get top 3 for podium (only from those who submitted)
  const topThree = leaderboard?.filter(e => e.has_submitted).slice(0, 3) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="hidden sm:inline">Leaderboard</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1">{assignmentTitle}</p>
        </DialogHeader>

        {/* Stats Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {submittedCount}/{totalCount} mahasiswa sudah mengerjakan
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Belum ada mahasiswa yang mengerjakan quiz</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium (Visible on all screens) */}
            {topThree.length >= 3 && (
              <div className="flex justify-center items-end gap-2 sm:gap-4 mb-8 pt-6">
                {/* 2nd Place */}
                <div className="flex flex-col items-center z-10 -mr-2 sm:-mr-4">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-4 border-gray-200 z-10 bg-white dark:bg-gray-800 shadow-md">
                    <AvatarImage src={topThree[1]?.photo_url || ''} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-sm sm:text-base font-bold">
                      {getInitials(topThree[1]?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 w-20 sm:w-24 h-24 sm:h-28 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-t-lg flex flex-col items-center justify-start pt-3 sm:pt-4 shadow-lg border-t border-l border-r border-gray-300 dark:border-gray-600">
                    <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">2</span>
                    <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-1" />
                  </div>
                  <div className="text-center mt-3 w-24">
                    <p className="text-[11px] sm:text-xs font-semibold truncate px-1" title={topThree[1]?.full_name}>{topThree[1]?.full_name.split(' ')[0]}</p>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs mt-1 font-bold">{topThree[1]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                </div>
                
                {/* 1st Place */}
                <div className="flex flex-col items-center z-20">
                  <Crown className="h-8 w-8 text-yellow-500 mb-1 drop-shadow-md animate-pulse" />
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-yellow-400 z-10 shadow-xl bg-white dark:bg-gray-800">
                    <AvatarImage src={topThree[0]?.photo_url || ''} />
                    <AvatarFallback className="bg-yellow-100 text-yellow-700 text-base sm:text-lg font-bold">
                      {getInitials(topThree[0]?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 w-24 sm:w-28 h-32 sm:h-36 bg-gradient-to-t from-yellow-400 to-yellow-300 dark:from-yellow-700 dark:to-yellow-600 rounded-t-lg flex flex-col items-center justify-start pt-3 sm:pt-4 shadow-xl border-t border-l border-r border-yellow-300 dark:border-yellow-500">
                    <span className="text-3xl sm:text-4xl font-black text-yellow-100 drop-shadow-md">1</span>
                  </div>
                  <div className="text-center mt-3 w-28">
                    <p className="text-[11px] sm:text-xs font-bold truncate px-1 text-yellow-600 dark:text-yellow-400" title={topThree[0]?.full_name}>{topThree[0]?.full_name.split(' ')[0]}</p>
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 text-[10px] sm:text-xs mt-1 border border-yellow-300 dark:border-yellow-700 font-bold">{topThree[0]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                </div>
                
                {/* 3rd Place */}
                <div className="flex flex-col items-center z-10 -ml-2 sm:-ml-4">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-4 border-amber-300 z-10 bg-white dark:bg-gray-800 shadow-md">
                    <AvatarImage src={topThree[2]?.photo_url || ''} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 text-sm sm:text-base font-bold">
                      {getInitials(topThree[2]?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-t from-amber-300 to-amber-200 dark:from-amber-800 dark:to-amber-700 rounded-t-lg flex flex-col items-center justify-start pt-3 sm:pt-4 shadow-lg border-t border-l border-r border-amber-300 dark:border-amber-600">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">3</span>
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mt-1" />
                  </div>
                  <div className="text-center mt-3 w-24">
                    <p className="text-[11px] sm:text-xs font-semibold truncate px-1" title={topThree[2]?.full_name}>{topThree[2]?.full_name.split(' ')[0]}</p>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs mt-1 font-bold">{topThree[2]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Rank</TableHead>
                      <TableHead>Mahasiswa</TableHead>
                      <TableHead>NIM</TableHead>
                      <TableHead className="text-center">Percobaan</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow 
                        key={entry.student_profile_id}
                        className={cn(
                          !entry.has_submitted && 'opacity-60'
                        )}
                      >
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {getRankIcon(entry.rank, entry.has_submitted)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={entry.photo_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(entry.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.nim || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.has_submitted ? (
                            <span className="text-muted-foreground flex items-center justify-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {entry.attempts}x
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.has_submitted ? (
                            <span className={cn('font-bold text-lg', getScoreColor(entry.best_score))}>
                              {entry.best_score?.toFixed(0) ?? 0}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.has_submitted ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Selesai
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Belum mengerjakan
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalCount > 10 && (
                <p className="mt-2 text-xs text-muted-foreground">Scroll untuk melihat semua mahasiswa.</p>
              )}
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden">
              <div className="max-h-[60vh] overflow-auto">
                <div className="space-y-2 pr-4">
                  {/* Full Leaderboard List */}
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.student_profile_id}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border transition-all',
                        getRankBgClass(entry.rank, entry.has_submitted)
                      )}
                    >
                      {/* Top row on mobile: Rank, Avatar, Name & NIM */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Rank */}
                        <div className="w-6 sm:w-8 flex justify-center shrink-0">
                          {getRankIcon(entry.rank, entry.has_submitted)}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                          <AvatarImage src={entry.photo_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(entry.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name & NIM */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{entry.full_name}</p>
                          {entry.nim && (
                            <p className="text-xs text-muted-foreground">{entry.nim}</p>
                          )}
                        </div>
                      </div>

                      {/* Score & Attempts - second row on mobile */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pl-9 sm:pl-0 shrink-0">
                        {entry.has_submitted ? (
                          <>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 sm:order-1">
                              <TrendingUp className="h-3 w-3" />
                              {entry.attempts}x percobaan
                            </span>
                            <span className={cn('font-bold text-base sm:text-lg sm:order-2 sm:ml-2', getScoreColor(entry.best_score))}>
                              {entry.best_score?.toFixed(0) ?? 0}%
                            </span>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Belum mengerjakan
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {totalCount > 10 && (
                <p className="mt-2 text-xs text-muted-foreground">Scroll untuk melihat semua mahasiswa.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
