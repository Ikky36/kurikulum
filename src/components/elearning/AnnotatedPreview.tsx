import { useState, useRef, useMemo, useEffect } from 'react';
import { ExternalLink, FileText, Video, Music, Presentation, AlertCircle, Play, Image as ImageIcon, Maximize2, MessageSquare, Highlighter, PanelRightClose, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { parseLinkInfo, type LinkInfo } from './LinkPreviewEmbed';
import { DocumentAnnotationOverlay } from './DocumentAnnotationOverlay';
import { VideoTimestampComments, VideoProgressMarkers } from './VideoTimestampComments';

interface AnnotatedPreviewProps {
  url: string;
  submissionId?: string;
  materialId?: string;
  showFullscreen?: boolean;
  enableAnnotations?: boolean;
  enableVideoComments?: boolean;
}

export function AnnotatedPreview({
  url,
  submissionId,
  materialId,
  showFullscreen = false,
  enableAnnotations = true,
  enableVideoComments = true,
}: AnnotatedPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const linkInfo = useMemo(() => parseLinkInfo(url), [url]);

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
    // For embedded videos (YouTube, etc.), we can't control them directly
    // but the markers still help users know where comments are
  };

  if (!linkInfo.canEmbed || !linkInfo.embedUrl) {
    return (
      <div className="border rounded-lg p-6 sm:p-8 bg-muted/30">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4" />
          <p className="text-center mb-3 sm:mb-4 text-sm sm:text-base">Preview tidak tersedia. Buka link secara manual.</p>
          <Button variant="outline" className="gap-2" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Buka Link
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const getPreviewTitle = () => {
    switch (linkInfo.category) {
      case 'video': return 'Preview Video';
      case 'audio': return 'Preview Audio';
      case 'image': return 'Preview Gambar';
      case 'document': return 'Preview Dokumen';
      default: return 'Preview';
    }
  };

  const isVideo = linkInfo.category === 'video';
  const isDocument = linkInfo.category === 'document' || linkInfo.category === 'image';
  const canAnnotate = isDocument && enableAnnotations;
  // Video annotations/comments disabled
  const canCommentVideo = false;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {canAnnotate && (
            <Button
              variant={showAnnotations ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              <Highlighter className="h-4 w-4" />
              <span className="hidden sm:inline">{showAnnotations ? 'Tutup Anotasi' : 'Anotasi'}</span>
            </Button>
          )}
          {canCommentVideo && (
            <Button
              variant={showVideoPanel ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowVideoPanel(!showVideoPanel)}
            >
              {showVideoPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
              <span className="hidden sm:inline">{showVideoPanel ? 'Sembunyikan' : 'Komentar'}</span>
            </Button>
          )}
        </div>
        
        {showFullscreen && isDocument && (
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[98vw] h-[95vh] max-h-[95vh] p-3 sm:p-6 flex flex-col">
              <DialogHeader className="pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  {linkInfo.icon}
                  {getPreviewTitle()} - Fullscreen
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden rounded-lg relative">
                {linkInfo.category === 'image' ? (
                  <div className="h-full flex items-center justify-center bg-muted/30 relative">
                    <img 
                      src={linkInfo.embedUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain"
                    />
                    {/* Always show overlay to display existing annotations */}
                    {canAnnotate && (
                      <DocumentAnnotationOverlay
                        submissionId={submissionId}
                        materialId={materialId}
                        enabled={showAnnotations}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <iframe
                      src={linkInfo.embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    {/* Always show overlay to display existing annotations */}
                    {canAnnotate && (
                      <DocumentAnnotationOverlay
                        submissionId={submissionId}
                        materialId={materialId}
                        enabled={showAnnotations}
                      />
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content with annotations/comments */}
      <div className={`rounded-lg overflow-hidden border bg-muted/10 ${canCommentVideo && showVideoPanel ? 'flex flex-col lg:flex-row' : ''}`}>
        {/* Main preview area */}
        <div className={`relative ${canCommentVideo && showVideoPanel ? 'lg:flex-1' : ''}`}>
          {isVideo ? (
            linkInfo.type === 'video' ? (
              <div className="space-y-1">
                <video 
                  ref={videoRef}
                  controls 
                  className="w-full max-h-[300px] sm:max-h-[400px] bg-black"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                >
                  <source src={linkInfo.embedUrl} />
                  Browser Anda tidak mendukung video tag.
                </video>
                {/* Progress markers for direct video */}
                {canCommentVideo && videoDuration > 0 && (
                  <div className="px-2 pb-2">
                    <VideoProgressMarkers
                      submissionId={submissionId}
                      materialId={materialId}
                      videoDuration={videoDuration}
                      onSeek={handleSeek}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Portrait video (TikTok, Instagram Reels, etc.) */}
                {linkInfo.isPortrait ? (
                  <div className="flex justify-center bg-black">
                    <div className="relative w-full max-w-[400px] h-[50vh] sm:h-[60vh] lg:h-[70vh]">
                      <iframe
                        ref={iframeRef}
                        src={linkInfo.embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-[200px] sm:h-[280px] lg:h-[420px] xl:h-[480px] bg-black">
                    <iframe
                      ref={iframeRef}
                      src={linkInfo.embedUrl}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {/* Note: For embedded videos like YouTube, we can't get exact duration/time */}
                {canCommentVideo && (
                  <div className="px-2 pb-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Untuk video embed, masukkan timestamp manual pada panel komentar
                    </p>
                  </div>
                )}
              </div>
            )
          ) : linkInfo.category === 'audio' ? (
            linkInfo.type === 'audio' ? (
              <div className="flex flex-col items-center py-6 sm:py-8 px-4 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="relative mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-primary/20 flex items-center justify-center">
                    <Music className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                </div>
                <audio controls className="w-full max-w-md">
                  <source src={linkInfo.embedUrl} />
                  Browser Anda tidak mendukung audio tag.
                </audio>
              </div>
            ) : (
              <iframe
                src={linkInfo.embedUrl}
                className="w-full h-[152px] border-0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            )
          ) : linkInfo.category === 'image' ? (
            <div className="flex justify-center p-4 bg-muted/30 relative">
              <img 
                src={linkInfo.embedUrl} 
                alt="Preview" 
                className="max-w-full max-h-[250px] sm:max-h-[350px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => showFullscreen && setIsFullscreen(true)}
              />
              {/* Always show overlay to display existing annotations */}
              {canAnnotate && (
                <DocumentAnnotationOverlay
                  submissionId={submissionId}
                  materialId={materialId}
                  enabled={showAnnotations}
                />
              )}
            </div>
          ) : (
            // Documents
            <div className="relative w-full pb-[120%] sm:pb-[80%] lg:pb-[60%]">
              <iframe
                src={linkInfo.embedUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Always show overlay to display existing annotations */}
              {canAnnotate && (
                <DocumentAnnotationOverlay
                  submissionId={submissionId}
                  materialId={materialId}
                  enabled={showAnnotations}
                />
              )}
            </div>
          )}
        </div>

        {/* Video comments panel */}
        {canCommentVideo && showVideoPanel && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l bg-background">
            <VideoTimestampComments
              submissionId={submissionId}
              materialId={materialId}
              videoDuration={videoDuration}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          </div>
        )}
      </div>
    </div>
  );
}
