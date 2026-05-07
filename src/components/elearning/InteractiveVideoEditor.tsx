import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Bookmark, HelpCircle, Type, Image as ImageIcon, Video } from 'lucide-react';

export type InteractiveMarkerKind = 'bookmark' | 'text' | 'image' | 'question';

export interface InteractiveQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  rewindTo?: number; // seconds to seek back to on wrong answer (default time - 10)
  feedback?: string;
}

export interface InteractiveMarker {
  id: string;
  time: number; // seconds
  kind: InteractiveMarkerKind;
  label?: string;
  // text/image overlay
  content?: string;
  imageUrl?: string;
  durationSec?: number; // overlay show duration (default 5)
  // question
  question?: InteractiveQuestion;
}

export interface InteractiveVideo {
  url: string;
  markers: InteractiveMarker[];
}

interface Props {
  value: InteractiveVideo | null | undefined;
  onChange: (v: InteractiveVideo | null) => void;
}

const KIND_META: Record<InteractiveMarkerKind, { label: string; icon: React.ReactNode; color: string }> = {
  bookmark: { label: 'Bookmark', icon: <Bookmark className="h-3 w-3" />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  text: { label: 'Teks', icon: <Type className="h-3 w-3" />, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  image: { label: 'Gambar', icon: <ImageIcon className="h-3 w-3" />, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  question: { label: 'Soal', icon: <HelpCircle className="h-3 w-3" />, color: 'bg-primary/10 text-primary border-primary/30' },
};

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function parseTime(input: string): number {
  if (!input) return 0;
  if (input.includes(':')) {
    const parts = input.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseInt(input, 10) || 0;
}

export function InteractiveVideoEditor({ value, onChange }: Props) {
  const data: InteractiveVideo = value || { url: '', markers: [] };
  const [newKind, setNewKind] = useState<InteractiveMarkerKind>('bookmark');

  const update = (patch: Partial<InteractiveVideo>) => {
    onChange({ ...data, ...patch });
  };

  const addMarker = () => {
    const m: InteractiveMarker = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      time: 0,
      kind: newKind,
      durationSec: 5,
      ...(newKind === 'question'
        ? { question: { text: '', options: ['', ''], correctIndex: 0 } }
        : {}),
    };
    update({ markers: [...data.markers, m].sort((a, b) => a.time - b.time) });
  };

  const updateMarker = (id: string, patch: Partial<InteractiveMarker>) => {
    update({
      markers: data.markers
        .map(m => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.time - b.time),
    });
  };

  const removeMarker = (id: string) => {
    update({ markers: data.markers.filter(m => m.id !== id) });
  };

  const updateQuestion = (id: string, patch: Partial<InteractiveQuestion>) => {
    const m = data.markers.find(x => x.id === id);
    if (!m) return;
    updateMarker(id, { question: { ...(m.question || { text: '', options: ['', ''], correctIndex: 0 }), ...patch } });
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
      <Label className="text-sm flex items-center gap-2">
        <Video className="h-4 w-4" />
        Video Interaktif
      </Label>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">URL Video (YouTube, Vimeo, atau MP4/WebM langsung)</Label>
        <Input
          placeholder="YouTube, Vimeo, atau https://.../video.mp4"
          value={data.url}
          onChange={(e) => update({ url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Mendukung YouTube, Vimeo, dan file mp4/webm. Soal/overlay/bookmark akan tampil sesuai menit yang ditentukan.
        </p>
      </div>

      {data.url && (
        <>
          <div className="flex items-center gap-2">
            <Select value={newKind} onValueChange={(v) => setNewKind(v as InteractiveMarkerKind)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bookmark">Bookmark</SelectItem>
                <SelectItem value="text">Teks Overlay</SelectItem>
                <SelectItem value="image">Gambar Overlay</SelectItem>
                <SelectItem value="question">Soal (Quiz)</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={addMarker} className="gap-1">
              <Plus className="h-4 w-4" />
              Tambah Marker
            </Button>
          </div>

          <div className="space-y-2">
            {data.markers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Belum ada marker.</p>
            ) : (
              data.markers.map((m) => (
                <Card key={m.id} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`gap-1 ${KIND_META[m.kind].color}`}>
                        {KIND_META[m.kind].icon}
                        {KIND_META[m.kind].label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs">Waktu:</Label>
                        <Input
                          className="h-7 w-24"
                          placeholder="mm:ss"
                          defaultValue={formatTime(m.time)}
                          onBlur={(e) => updateMarker(m.id, { time: parseTime(e.target.value) })}
                        />
                      </div>
                      <Input
                        className="h-7 flex-1 min-w-[150px]"
                        placeholder="Label/judul (opsional)"
                        value={m.label || ''}
                        onChange={(e) => updateMarker(m.id, { label: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeMarker(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {m.kind === 'text' && (
                      <div className="space-y-1">
                        <Textarea
                          rows={2}
                          placeholder="Teks yang akan ditampilkan di atas video..."
                          value={m.content || ''}
                          onChange={(e) => updateMarker(m.id, { content: e.target.value })}
                        />
                        <Input
                          className="h-7 w-32"
                          type="number"
                          min={1}
                          placeholder="Durasi (detik)"
                          value={m.durationSec || 5}
                          onChange={(e) => updateMarker(m.id, { durationSec: parseInt(e.target.value, 10) || 5 })}
                        />
                      </div>
                    )}

                    {m.kind === 'image' && (
                      <div className="space-y-1">
                        <Input
                          placeholder="URL gambar"
                          value={m.imageUrl || ''}
                          onChange={(e) => updateMarker(m.id, { imageUrl: e.target.value })}
                        />
                        <Input
                          className="h-7 w-32"
                          type="number"
                          min={1}
                          placeholder="Durasi (detik)"
                          value={m.durationSec || 5}
                          onChange={(e) => updateMarker(m.id, { durationSec: parseInt(e.target.value, 10) || 5 })}
                        />
                      </div>
                    )}

                    {m.kind === 'question' && m.question && (
                      <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                        <Textarea
                          rows={2}
                          placeholder="Pertanyaan..."
                          value={m.question.text}
                          onChange={(e) => updateQuestion(m.id, { text: e.target.value })}
                        />
                        <div className="space-y-1">
                          {m.question.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={m.question!.correctIndex === i}
                                onChange={() => updateQuestion(m.id, { correctIndex: i })}
                                title="Tandai sebagai jawaban benar"
                              />
                              <Input
                                className="h-7 flex-1"
                                placeholder={`Pilihan ${i + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...m.question!.options];
                                  opts[i] = e.target.value;
                                  updateQuestion(m.id, { options: opts });
                                }}
                              />
                              {m.question!.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    const opts = m.question!.options.filter((_, idx) => idx !== i);
                                    const ci = m.question!.correctIndex >= opts.length ? 0 : m.question!.correctIndex;
                                    updateQuestion(m.id, { options: opts, correctIndex: ci });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() =>
                              updateQuestion(m.id, { options: [...m.question!.options, ''] })
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah Pilihan
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-xs">Ulang ke menit (jika salah):</Label>
                          <Input
                            className="h-7 w-24"
                            placeholder="mm:ss"
                            defaultValue={formatTime(m.question.rewindTo ?? Math.max(0, m.time - 10))}
                            onBlur={(e) => updateQuestion(m.id, { rewindTo: parseTime(e.target.value) })}
                          />
                        </div>
                        <Input
                          className="h-7"
                          placeholder="Feedback jika salah (opsional)"
                          value={m.question.feedback || ''}
                          onChange={(e) => updateQuestion(m.id, { feedback: e.target.value })}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {data.url && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onChange(null)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Hapus Video Interaktif
        </Button>
      )}
    </div>
  );
}
