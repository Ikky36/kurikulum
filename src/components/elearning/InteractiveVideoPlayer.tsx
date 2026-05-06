import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, HelpCircle, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InteractiveVideo, InteractiveMarker } from './InteractiveVideoEditor';

interface Props {
  data: InteractiveVideo;
  title?: string;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

interface ActiveOverlay {
  marker: InteractiveMarker;
  expiresAt: number;
}

export function InteractiveVideoPlayer({ data, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [overlay, setOverlay] = useState<ActiveOverlay | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<InteractiveMarker | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questionResult, setQuestionResult] = useState<'correct' | 'wrong' | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const passedQuestionsRef = useRef<Set<string>>(new Set());

  const sortedMarkers = [...(data.markers || [])].sort((a, b) => a.time - b.time);
  const bookmarks = sortedMarkers.filter(m => m.kind === 'bookmark');

  // Time tracking
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      const t = v.currentTime;
      setCurrentTime(t);

      // Expire overlay
      if (overlay && Date.now() > overlay.expiresAt) {
        setOverlay(null);
      }

      // Trigger markers within 0.6s window, not yet fired
      for (const m of sortedMarkers) {
        if (firedRef.current.has(m.id)) continue;
        if (t >= m.time && t < m.time + 0.8) {
          firedRef.current.add(m.id);
          if (m.kind === 'text' || m.kind === 'image') {
            setOverlay({ marker: m, expiresAt: Date.now() + (m.durationSec || 5) * 1000 });
          } else if (m.kind === 'question') {
            if (!passedQuestionsRef.current.has(m.id)) {
              v.pause();
              setActiveQuestion(m);
              setSelectedAnswer(null);
              setQuestionResult(null);
            }
          }
        }
      }
    };

    const onSeeking = () => {
      // Allow re-firing markers that are ahead of new position
      const t = v.currentTime;
      firedRef.current = new Set(
        sortedMarkers.filter(m => m.time < t - 0.5).map(m => m.id)
      );
    };

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeking', onSeeking);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeking', onSeeking);
    };
  }, [sortedMarkers, overlay]);

  const seekTo = (sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = sec;
    v.play().catch(() => {});
  };

  const handleSubmitAnswer = () => {
    if (!activeQuestion?.question || selectedAnswer === null) return;
    const isCorrect = selectedAnswer === activeQuestion.question.correctIndex;
    setQuestionResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      passedQuestionsRef.current.add(activeQuestion.id);
    }
  };

  const handleContinue = () => {
    if (!activeQuestion) return;
    const v = videoRef.current;
    if (questionResult === 'wrong' && v) {
      const rewindTo = activeQuestion.question?.rewindTo ?? Math.max(0, activeQuestion.time - 10);
      // allow re-trigger on rewind
      firedRef.current.delete(activeQuestion.id);
      v.currentTime = rewindTo;
      v.play().catch(() => {});
    } else if (v) {
      v.play().catch(() => {});
    }
    setActiveQuestion(null);
    setSelectedAnswer(null);
    setQuestionResult(null);
  };

  if (!data?.url) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[1fr_240px] gap-0">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={data.url}
              controls
              className="w-full max-h-[70vh] bg-black"
              title={title}
            />

            {/* Overlay text/image */}
            {overlay && (
              <div className="absolute inset-x-0 top-0 flex justify-center p-3 pointer-events-none animate-in fade-in slide-in-from-top-2">
                <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg px-4 py-3 max-w-[90%] pointer-events-auto">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {overlay.marker.label && (
                        <p className="text-xs font-semibold text-primary mb-1">{overlay.marker.label}</p>
                      )}
                      {overlay.marker.kind === 'text' && (
                        <p className="text-sm whitespace-pre-wrap">{overlay.marker.content}</p>
                      )}
                      {overlay.marker.kind === 'image' && overlay.marker.imageUrl && (
                        <img
                          src={overlay.marker.imageUrl}
                          alt={overlay.marker.label || 'overlay'}
                          className="max-h-48 rounded"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setOverlay(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Question modal overlay */}
            {activeQuestion?.question && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-10">
                <Card className="w-full max-w-lg">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <HelpCircle className="h-5 w-5" />
                      <span className="font-semibold">Soal pada {formatTime(activeQuestion.time)}</span>
                    </div>
                    <p className="text-base font-medium">{activeQuestion.question.text}</p>
                    <div className="space-y-2">
                      {activeQuestion.question.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={questionResult !== null}
                          onClick={() => setSelectedAnswer(i)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                            selectedAnswer === i
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted',
                            questionResult === 'correct' && i === activeQuestion.question!.correctIndex && 'border-green-500 bg-green-500/10',
                            questionResult === 'wrong' && i === selectedAnswer && 'border-destructive bg-destructive/10',
                          )}
                        >
                          {opt || <span className="italic text-muted-foreground">(kosong)</span>}
                        </button>
                      ))}
                    </div>

                    {questionResult === 'correct' && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Benar! Anda dapat melanjutkan video.
                      </div>
                    )}
                    {questionResult === 'wrong' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Jawaban salah. Anda akan diarahkan untuk menonton ulang.
                        </div>
                        {activeQuestion.question.feedback && (
                          <p className="text-xs text-muted-foreground">{activeQuestion.question.feedback}</p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {questionResult === null ? (
                        <Button
                          type="button"
                          onClick={handleSubmitAnswer}
                          disabled={selectedAnswer === null}
                        >
                          Kirim Jawaban
                        </Button>
                      ) : (
                        <Button type="button" onClick={handleContinue}>
                          {questionResult === 'wrong' ? 'Tonton Ulang' : 'Lanjutkan'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Bookmark sidebar */}
          <div className="border-l bg-muted/30 max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b sticky top-0 bg-muted/80 backdrop-blur">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Navigasi ({sortedMarkers.length})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sekarang: {formatTime(currentTime)}
              </p>
            </div>
            <div className="p-2 space-y-1">
              {sortedMarkers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-2">Tidak ada marker.</p>
              ) : (
                sortedMarkers.map((m) => {
                  const isPast = currentTime >= m.time;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => seekTo(m.time)}
                      className={cn(
                        'w-full text-left px-2 py-2 rounded-md hover:bg-muted text-xs transition-colors flex items-start gap-2',
                        isPast && 'opacity-70'
                      )}
                    >
                      <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                        {formatTime(m.time)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {m.kind === 'bookmark' && <Bookmark className="h-3 w-3 text-blue-500" />}
                          {m.kind === 'question' && <HelpCircle className="h-3 w-3 text-primary" />}
                          {m.kind === 'text' && <span className="text-amber-500 text-xs">T</span>}
                          {m.kind === 'image' && <span className="text-purple-500 text-xs">G</span>}
                          <span className="font-medium truncate">
                            {m.label || m.kind}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
