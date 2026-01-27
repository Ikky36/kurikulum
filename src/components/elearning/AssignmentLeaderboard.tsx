import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      // First get the class_group_id from elearning_classes
      const { data: classData, error: classError } = await supabase
        .from('elearning_classes')
        .select('class_group_id')
        .eq('id', classId)
        .maybeSingle();

      if (classError) throw classError;
      if (!classData?.class_group_id) return [];

      // Get all students in the class
      const { data: classStudents, error: studentsError } = await supabase
        .from('class_students')
        .select(`
          student_profile_id,
          student:profiles!class_students_student_profile_id_fkey (
            id,
            full_name,
            nim,
            photo_url
          )
        `)
        .eq('class_group_id', classData.class_group_id);

      if (studentsError) throw studentsError;

      // Get all submissions for this assignment
      const { data: submissions, error: submissionsError } = await supabase
        .from('elearning_submissions')
        .select(`
          student_profile_id,
          score,
          attempt_number,
          submitted_at
        `)
        .eq('assignment_id', assignmentId);

      if (submissionsError) throw submissionsError;

      // Create a map of student submissions with best scores
      const submissionMap = new Map<string, { best_score: number; attempts: number; submitted_at: string }>();
      
      (submissions || []).forEach((submission) => {
        const studentId = submission.student_profile_id;
        const existing = submissionMap.get(studentId);
        const score = submission.score ?? 0;
        
        if (!existing) {
          submissionMap.set(studentId, {
            best_score: score,
            attempts: 1,
            submitted_at: submission.submitted_at,
          });
        } else {
          existing.attempts += 1;
          if (score > existing.best_score) {
            existing.best_score = score;
            existing.submitted_at = submission.submitted_at;
          }
        }
      });

      // Combine class students with their submissions
      const entries: LeaderboardEntry[] = (classStudents || []).map((cs: any) => {
        const submission = submissionMap.get(cs.student_profile_id);
        return {
          rank: 0,
          student_profile_id: cs.student_profile_id,
          full_name: cs.student?.full_name || 'Unknown',
          nim: cs.student?.nim || null,
          photo_url: cs.student?.photo_url || null,
          best_score: submission?.best_score ?? null,
          attempts: submission?.attempts || 0,
          submitted_at: submission?.submitted_at || null,
          has_submitted: !!submission,
        };
      });

      // Sort: submitted students first (by score desc), then non-submitted (alphabetically)
      const sorted = entries.sort((a, b) => {
        if (a.has_submitted && !b.has_submitted) return -1;
        if (!a.has_submitted && b.has_submitted) return 1;
        if (a.has_submitted && b.has_submitted) {
          return (b.best_score ?? 0) - (a.best_score ?? 0);
        }
        return a.full_name.localeCompare(b.full_name);
      });

      // Assign ranks only to those who submitted
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

  const submittedCount = leaderboard?.filter(e => e.has_submitted).length || 0;
  const totalCount = leaderboard?.length || 0;

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
      <DialogContent className="max-w-md sm:max-w-lg">
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
            {submittedCount}/{totalCount} sudah mengerjakan
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
            <p className="text-muted-foreground">Tidak ada anggota kelas</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {/* Top 3 Podium for larger screens */}
              {topThree.length >= 3 && (
                <div className="hidden sm:flex justify-center items-end gap-2 mb-6 pt-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <Avatar className="h-12 w-12 border-2 border-gray-300">
                      <AvatarImage src={topThree[1]?.photo_url || ''} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                        {getInitials(topThree[1]?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2 w-16 h-16 bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-lg flex items-center justify-center">
                      <Medal className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-xs font-medium mt-1 text-center truncate w-20">{topThree[1]?.full_name.split(' ')[0]}</p>
                    <Badge variant="secondary" className="text-xs mt-1">{topThree[1]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                  
                  {/* 1st Place */}
                  <div className="flex flex-col items-center -mt-4">
                    <Crown className="h-6 w-6 text-yellow-500 mb-1" />
                    <Avatar className="h-14 w-14 border-2 border-yellow-400">
                      <AvatarImage src={topThree[0]?.photo_url || ''} />
                      <AvatarFallback className="bg-yellow-100 text-yellow-700 text-sm">
                        {getInitials(topThree[0]?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2 w-16 h-20 bg-gradient-to-t from-yellow-300 to-yellow-200 dark:from-yellow-600 dark:to-yellow-500 rounded-t-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-100">1</span>
                    </div>
                    <p className="text-xs font-medium mt-1 text-center max-w-28 leading-tight">{topThree[0]?.full_name}</p>
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs mt-1">{topThree[0]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                  
                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <Avatar className="h-12 w-12 border-2 border-amber-400">
                      <AvatarImage src={topThree[2]?.photo_url || ''} />
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                        {getInitials(topThree[2]?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2 w-16 h-12 bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-700 dark:to-amber-600 rounded-t-lg flex items-center justify-center">
                      <Award className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                    </div>
                    <p className="text-xs font-medium mt-1 text-center truncate w-20">{topThree[2]?.full_name.split(' ')[0]}</p>
                    <Badge variant="secondary" className="text-xs mt-1">{topThree[2]?.best_score?.toFixed(0) ?? 0}%</Badge>
                  </div>
                </div>
              )}

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
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
