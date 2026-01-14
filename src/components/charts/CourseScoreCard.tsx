import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CourseWithStats } from '@/lib/types';
import { CheckCircle2, XCircle, Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CourseScoreCardProps {
  course: CourseWithStats;
  delay?: number;
}

export function CourseScoreCard({ course, delay = 0 }: CourseScoreCardProps) {
  const { user } = useAuth();
  const isPassing = course.average_score >= course.passing_score;
  const passingPercentage = course.total_students > 0 
    ? Math.round((course.passing_count / course.total_students) * 100) 
    : 0;

  const isGuest = !user;

  const cardContent = (
    <Card 
      className={cn(
        "transition-all duration-300 overflow-hidden animate-slide-up",
        isGuest 
          ? "cursor-default opacity-90" 
          : "group cursor-pointer hover:shadow-lg hover:-translate-y-1"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "h-2 w-full",
        isPassing ? "gradient-success" : "bg-destructive"
      )} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="secondary" className="mb-2 text-xs font-medium">
              {course.code}
            </Badge>
            <CardTitle className={cn(
              "text-lg font-bold transition-colors",
              !isGuest && "group-hover:text-primary"
            )}>
              {course.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isGuest && <Lock className="h-4 w-4 text-muted-foreground" />}
            {isPassing ? (
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive shrink-0" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rata-rata Nilai</span>
            <span className={cn(
              "font-bold text-lg",
              isPassing ? "text-success" : "text-destructive"
            )}>
              {course.average_score.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capaian</span>
            <span className={cn(
              "font-bold",
              passingPercentage >= 50 ? "text-success" : "text-warning"
            )}>
              {passingPercentage}%
            </span>
          </div>
          <Progress 
            value={course.average_score} 
            className={cn(
              "h-3",
              isPassing ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
            )}
          />
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-semibold">{course.total_students}</span>
              <span className="text-muted-foreground"> Mahasiswa</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isGuest) {
    return cardContent;
  }

  return (
    <Link to={`/mata-kuliah/${course.id}`}>
      {cardContent}
    </Link>
  );
}
