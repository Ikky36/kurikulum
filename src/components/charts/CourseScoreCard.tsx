import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CourseWithStats } from '@/lib/types';
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseScoreCardProps {
  course: CourseWithStats;
  delay?: number;
}

export function CourseScoreCard({ course, delay = 0 }: CourseScoreCardProps) {
  const isPassing = course.average_score >= course.passing_score;
  const passingPercentage = course.total_students > 0 
    ? Math.round((course.passing_count / course.total_students) * 100) 
    : 0;

  return (
    <Link to={`/mata-kuliah/${course.id}`}>
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden",
          "animate-slide-up"
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
              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                {course.name}
              </CardTitle>
            </div>
            {isPassing ? (
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive shrink-0" />
            )}
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
    </Link>
  );
}
