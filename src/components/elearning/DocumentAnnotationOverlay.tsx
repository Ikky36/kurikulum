import { useState, useRef, useEffect } from 'react';
import { Highlighter, MessageSquare, Trash2, X, Send, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Annotation {
  id: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  annotation_type: string;
  highlight_color: string | null;
  comment_text: string | null;
  author_profile_id: string;
  created_at: string;
  author?: {
    full_name: string;
    photo_url: string | null;
  };
}

interface DocumentAnnotationOverlayProps {
  submissionId?: string;
  materialId?: string;
  enabled?: boolean;
}

const HIGHLIGHT_COLORS = [
  '#ffff00', // Yellow
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#45b7d1', // Blue
  '#96ceb4', // Green
  '#ffeaa7', // Light Yellow
  '#dfe6e9', // Gray
];

export function DocumentAnnotationOverlay({
  submissionId,
  materialId,
  enabled = true
}: DocumentAnnotationOverlayProps) {
  const { profile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'highlight' | 'comment' | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ffff00');
  const [currentDraw, setCurrentDraw] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch annotations
  useEffect(() => {
    if (!submissionId && !materialId) return;

    const fetchAnnotations = async () => {
      const query = supabase
        .from('document_annotations')
        .select(`
          *,
          author:profiles!document_annotations_author_profile_id_fkey(full_name, photo_url)
        `)
        .order('created_at', { ascending: true });

      if (submissionId) {
        query.eq('submission_id', submissionId);
      } else if (materialId) {
        query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching annotations:', error);
        return;
      }
      setAnnotations(data || []);
    };

    fetchAnnotations();
  }, [submissionId, materialId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!drawMode || !containerRef.current || !enabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawing(true);
    setCurrentDraw({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentDraw || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setCurrentDraw(prev => prev ? { ...prev, endX: x, endY: y } : null);
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentDraw || !profile) {
      setIsDrawing(false);
      setCurrentDraw(null);
      return;
    }

    const minX = Math.min(currentDraw.startX, currentDraw.endX);
    const minY = Math.min(currentDraw.startY, currentDraw.endY);
    const width = Math.abs(currentDraw.endX - currentDraw.startX);
    const height = Math.abs(currentDraw.endY - currentDraw.startY);

    // Minimum size check
    if (width < 2 || height < 2) {
      setIsDrawing(false);
      setCurrentDraw(null);
      return;
    }

    if (drawMode === 'comment') {
      // Show comment input
      setSelectedAnnotation({
        id: 'new',
        x_percent: minX,
        y_percent: minY,
        width_percent: width,
        height_percent: height,
        annotation_type: 'comment',
        highlight_color: selectedColor,
        comment_text: null,
        author_profile_id: profile.id,
        created_at: new Date().toISOString(),
      });
    } else {
      // Save highlight directly
      await saveAnnotation({
        x_percent: minX,
        y_percent: minY,
        width_percent: width,
        height_percent: height,
        annotation_type: 'highlight',
        highlight_color: selectedColor,
        comment_text: null,
      });
    }

    setIsDrawing(false);
    setCurrentDraw(null);
  };

  const saveAnnotation = async (annotation: {
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
    annotation_type: string;
    highlight_color: string | null;
    comment_text: string | null;
  }) => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_annotations')
        .insert({
          ...annotation,
          submission_id: submissionId || null,
          material_id: materialId || null,
          author_profile_id: profile.id,
        })
        .select(`
          *,
          author:profiles!document_annotations_author_profile_id_fkey(full_name, photo_url)
        `)
        .single();

      if (error) throw error;
      
      setAnnotations(prev => [...prev, data]);
      toast.success('Annotation ditambahkan');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Gagal menyimpan annotation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedAnnotation || !commentText.trim()) return;

    if (selectedAnnotation.id === 'new') {
      await saveAnnotation({
        x_percent: selectedAnnotation.x_percent,
        y_percent: selectedAnnotation.y_percent,
        width_percent: selectedAnnotation.width_percent,
        height_percent: selectedAnnotation.height_percent,
        annotation_type: 'comment',
        highlight_color: selectedColor,
        comment_text: commentText.trim(),
      });
    }

    setSelectedAnnotation(null);
    setCommentText('');
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('document_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;

      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSelectedAnnotation(null);
      toast.success('Annotation dihapus');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Gagal menghapus annotation');
    }
  };

  const getDrawRect = () => {
    if (!currentDraw) return null;
    return {
      left: `${Math.min(currentDraw.startX, currentDraw.endX)}%`,
      top: `${Math.min(currentDraw.startY, currentDraw.endY)}%`,
      width: `${Math.abs(currentDraw.endX - currentDraw.startX)}%`,
      height: `${Math.abs(currentDraw.endY - currentDraw.startY)}%`,
    };
  };

  // Always render annotations, but only enable drawing when enabled=true
  const isEditMode = enabled && drawMode !== null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ 
        cursor: isEditMode ? 'crosshair' : 'default',
        // Only capture pointer events when in draw mode, otherwise let events pass through
        pointerEvents: isEditMode ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) {
          setIsDrawing(false);
          setCurrentDraw(null);
        }
      }}
    >
      {/* Toolbar - only show when enabled */}
      {enabled && (
        <div 
          className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border z-20"
          style={{ pointerEvents: 'auto' }}
        >
          <Toggle
            pressed={drawMode === 'highlight'}
            onPressedChange={(pressed) => setDrawMode(pressed ? 'highlight' : null)}
            size="sm"
            aria-label="Highlight mode"
          >
            <Highlighter className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={drawMode === 'comment'}
            onPressedChange={(pressed) => setDrawMode(pressed ? 'comment' : null)}
            size="sm"
            aria-label="Comment mode"
          >
            <MessageSquare className="h-4 w-4" />
          </Toggle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <div 
                  className="h-4 w-4 rounded-full border-2 border-foreground/20" 
                  style={{ backgroundColor: selectedColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="bottom" align="end">
              <div className="flex gap-1">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      selectedColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Drawing preview */}
      {isDrawing && currentDraw && (
        <div
          className="absolute border-2 border-dashed pointer-events-none"
          style={{
            ...getDrawRect(),
            borderColor: selectedColor,
            backgroundColor: `${selectedColor}40`,
          }}
        />
      )}

      {/* Rendered annotations - always visible, clickable when not in draw mode */}
      {annotations.map(annotation => (
        <Popover 
          key={annotation.id}
          open={selectedAnnotation?.id === annotation.id}
          onOpenChange={(open) => {
            if (!open) setSelectedAnnotation(null);
          }}
        >
          <PopoverTrigger asChild>
            <div
              className="absolute cursor-pointer transition-opacity hover:opacity-80"
              style={{
                left: `${annotation.x_percent}%`,
                top: `${annotation.y_percent}%`,
                width: `${annotation.width_percent}%`,
                height: `${annotation.height_percent}%`,
                backgroundColor: annotation.highlight_color 
                  ? `${annotation.highlight_color}50` 
                  : 'transparent',
                border: annotation.annotation_type === 'comment' 
                  ? `2px solid ${annotation.highlight_color || '#ffff00'}` 
                  : 'none',
                // Allow clicking annotations even when overlay is not in edit mode
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAnnotation(annotation);
              }}
            >
              {annotation.annotation_type === 'comment' && (
                <div 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: annotation.highlight_color || '#ffff00' }}
                >
                  <MessageSquare className="h-3 w-3 text-foreground" />
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 p-3" 
            side="right" 
            align="start"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {annotation.author?.full_name || 'Unknown'}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(annotation.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {profile?.id === annotation.author_profile_id && enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {annotation.comment_text && (
                <p className="text-sm">{annotation.comment_text}</p>
              )}
              {annotation.annotation_type === 'highlight' && !annotation.comment_text && (
                <p className="text-xs text-muted-foreground italic">Highlight tanpa komentar</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ))}

      {/* New comment dialog */}
      {selectedAnnotation?.id === 'new' && (
        <div
          className="absolute z-30"
          style={{
            left: `${selectedAnnotation.x_percent + selectedAnnotation.width_percent + 1}%`,
            top: `${selectedAnnotation.y_percent}%`,
          }}
        >
          <div 
            className="bg-background border rounded-lg shadow-lg p-3 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tambah Komentar</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setSelectedAnnotation(null);
                  setCommentText('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tulis komentar..."
              className="min-h-[60px] text-sm mb-2"
              autoFocus
            />
            <Button
              size="sm"
              className="w-full gap-1"
              onClick={handleSaveComment}
              disabled={!commentText.trim() || loading}
            >
              <Send className="h-3.5 w-3.5" />
              Simpan
            </Button>
          </div>
        </div>
      )}

      {/* Mode indicator */}
      {enabled && drawMode && (
        <div 
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border text-xs"
          style={{ pointerEvents: 'auto' }}
        >
          {drawMode === 'highlight' ? 'Mode Highlight: Drag untuk highlight' : 'Mode Komentar: Drag untuk area komentar'}
        </div>
      )}
    </div>
  );
}
