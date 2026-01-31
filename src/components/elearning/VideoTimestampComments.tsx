import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { MessageSquare, Send, Trash2, Clock, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoComment {
  id: string;
  timestamp_seconds: number;
  comment_text: string;
  author_profile_id: string;
  created_at: string;
  author?: {
    full_name: string;
    photo_url: string | null;
  };
}

interface VideoTimestampCommentsProps {
  submissionId?: string;
  materialId?: string;
  videoDuration?: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export interface VideoTimestampCommentsRef {
  getCurrentTime: () => number;
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse time string (MM:SS) to seconds
function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

export const VideoTimestampComments = forwardRef<VideoTimestampCommentsRef, VideoTimestampCommentsProps>(({
  submissionId,
  materialId,
  videoDuration = 0,
  currentTime = 0,
  onSeek,
}, ref) => {
  const { profile } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newTimestamp, setNewTimestamp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => currentTime,
  }));

  // Fetch comments
  useEffect(() => {
    if (!submissionId && !materialId) return;

    const fetchComments = async () => {
      const query = supabase
        .from('video_comments')
        .select(`
          *,
          author:profiles!video_comments_author_profile_id_fkey(full_name, photo_url)
        `)
        .order('timestamp_seconds', { ascending: true });

      if (submissionId) {
        query.eq('submission_id', submissionId);
      } else if (materialId) {
        query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching video comments:', error);
        return;
      }
      setComments(data || []);
    };

    fetchComments();
  }, [submissionId, materialId]);

  // Set current time as default when opening
  useEffect(() => {
    if (currentTime > 0 && !newTimestamp) {
      setNewTimestamp(formatTime(currentTime));
    }
  }, [currentTime]);

  const handleAddComment = async () => {
    if (!profile || !newComment.trim()) return;

    const timestampSeconds = parseTime(newTimestamp);
    if (timestampSeconds === null) {
      toast.error('Format waktu tidak valid. Gunakan MM:SS');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          submission_id: submissionId || null,
          material_id: materialId || null,
          author_profile_id: profile.id,
          timestamp_seconds: timestampSeconds,
          comment_text: newComment.trim(),
        })
        .select(`
          *,
          author:profiles!video_comments_author_profile_id_fkey(full_name, photo_url)
        `)
        .single();

      if (error) throw error;

      setComments(prev => [...prev, data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      setNewComment('');
      setNewTimestamp(formatTime(currentTime));
      toast.success('Komentar ditambahkan');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Gagal menambahkan komentar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Komentar dihapus');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Gagal menghapus komentar');
    }
  };

  const handleSeekToComment = (seconds: number) => {
    onSeek?.(seconds);
  };

  const handleUseCurrentTime = () => {
    setNewTimestamp(formatTime(currentTime));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel toggle for mobile */}
      <div className="lg:hidden p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPanel(!showPanel)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Komentar Video ({comments.length})
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${showPanel ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      <div className={`flex-1 flex flex-col ${showPanel ? '' : 'hidden lg:flex'}`}>
        {/* Comments list */}
        <ScrollArea className="flex-1 p-3">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada komentar</p>
              <p className="text-xs mt-1">Tambahkan komentar pada timestamp tertentu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="group bg-muted/50 rounded-lg p-3 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={comment.author?.photo_url || ''} />
                      <AvatarFallback className="text-xs">
                        {comment.author?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">
                          {comment.author?.full_name || 'Unknown'}
                        </span>
                        {profile?.id === comment.author_profile_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <button
                        onClick={() => handleSeekToComment(comment.timestamp_seconds)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                      >
                        <Clock className="h-3 w-3" />
                        {formatTime(comment.timestamp_seconds)}
                      </button>
                      <p className="text-sm mt-1">{comment.comment_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Add comment form */}
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <Input
                value={newTimestamp}
                onChange={(e) => setNewTimestamp(e.target.value)}
                placeholder="0:00"
                className="w-20 text-center text-sm pr-6"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full w-6 p-0"
                onClick={handleUseCurrentTime}
                title="Gunakan waktu saat ini"
              >
                <Clock className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Tulis komentar..."
              className="min-h-[40px] max-h-[80px] text-sm flex-1"
              rows={1}
            />
          </div>
          <Button
            size="sm"
            className="w-full gap-1"
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
          >
            <Send className="h-3.5 w-3.5" />
            Kirim Komentar
          </Button>
        </div>
      </div>
    </div>
  );
});

VideoTimestampComments.displayName = 'VideoTimestampComments';

// Progress bar markers component
interface VideoProgressMarkersProps {
  comments: VideoComment[];
  videoDuration: number;
  onSeek: (time: number) => void;
}

export function VideoProgressMarkers({ 
  submissionId,
  materialId,
  videoDuration,
  onSeek,
}: {
  submissionId?: string;
  materialId?: string;
  videoDuration: number;
  onSeek: (time: number) => void;
}) {
  const [comments, setComments] = useState<VideoComment[]>([]);

  useEffect(() => {
    if (!submissionId && !materialId) return;

    const fetchComments = async () => {
      const query = supabase
        .from('video_comments')
        .select(`
          *,
          author:profiles!video_comments_author_profile_id_fkey(full_name, photo_url)
        `)
        .order('timestamp_seconds', { ascending: true });

      if (submissionId) {
        query.eq('submission_id', submissionId);
      } else if (materialId) {
        query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setComments(data);
      }
    };

    fetchComments();
  }, [submissionId, materialId]);

  if (videoDuration <= 0 || comments.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="relative w-full h-2">
        {comments.map(comment => {
          const position = (comment.timestamp_seconds / videoDuration) * 100;
          return (
            <Tooltip key={comment.id}>
              <TooltipTrigger asChild>
                <button
                  className="absolute top-0 w-2 h-2 -translate-x-1/2 rounded-full bg-primary hover:bg-primary/80 transition-colors hover:scale-125 z-10"
                  style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
                  onClick={() => onSeek(comment.timestamp_seconds)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="text-xs">
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(comment.timestamp_seconds)}
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    {comment.comment_text}
                  </p>
                  <p className="text-muted-foreground/70 mt-1">
                    - {comment.author?.full_name}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
