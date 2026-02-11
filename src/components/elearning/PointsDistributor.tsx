import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Loader2, Zap } from 'lucide-react';

interface PointsDistributorProps {
  questionCount: number;
  onDistribute: (pointsPerQuestion: number) => Promise<void>;
  isLoading?: boolean;
}

export function PointsDistributor({ 
  questionCount, 
  onDistribute,
  isLoading = false,
}: PointsDistributorProps) {
  const { toast } = useToast();
  const [totalPoints, setTotalPoints] = useState('100');
  const [isDistributing, setIsDistributing] = useState(false);

  const totalPointsNum = parseInt(totalPoints) || 0;
  const pointsPerQuestion = questionCount > 0 ? Math.max(1, Math.round(totalPointsNum / questionCount)) : 0;
  const actualTotal = pointsPerQuestion * questionCount;
  const remainder = totalPointsNum - actualTotal;

  const handleDistribute = async () => {
    if (questionCount === 0) {
      toast({
        title: 'Error',
        description: 'Tidak ada soal untuk didistribusikan poin',
        variant: 'destructive',
      });
      return;
    }

    if (totalPointsNum <= 0) {
      toast({
        title: 'Error',
        description: 'Total poin harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    setIsDistributing(true);
    try {
      await onDistribute(pointsPerQuestion);
      toast({
        title: 'Sukses',
        description: `Poin berhasil didistribusikan: ${pointsPerQuestion} poin per soal`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal mendistribusikan poin',
        variant: 'destructive',
      });
    } finally {
      setIsDistributing(false);
    }
  };

  if (questionCount === 0) {
    return null;
  }

  return (
    <Card className="border-secondary bg-gradient-to-br from-secondary/10 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-secondary-foreground" />
          Distribusi Poin Merata
        </CardTitle>
        <CardDescription className="text-sm">
          Bagikan total poin secara merata ke semua soal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 flex-1 min-w-[150px]">
            <Label htmlFor="total-points">Total Poin</Label>
            <Input
              id="total-points"
              type="number"
              min={1}
              value={totalPoints}
              onChange={(e) => setTotalPoints(e.target.value)}
              placeholder="Masukkan total poin"
              className="h-10"
            />
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Jumlah Soal</p>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {questionCount}
              </Badge>
            </div>
            
            <div className="text-xl text-muted-foreground">=</div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Poin/Soal</p>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pointsPerQuestion}
              </Badge>
            </div>
          </div>
        </div>

        {remainder !== 0 && (
          <p className="text-xs text-muted-foreground">
            ⚠️ Sisa pembagian: {remainder} poin (total aktual: {actualTotal} poin)
          </p>
        )}

        <Button
          onClick={handleDistribute}
          disabled={isDistributing || isLoading || questionCount === 0 || totalPointsNum <= 0}
          className="w-full gap-2"
          variant="secondary"
        >
          {isDistributing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mendistribusikan...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Distribusikan ke {questionCount} Soal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
