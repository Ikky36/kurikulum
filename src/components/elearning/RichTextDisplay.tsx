import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { sanitizeHtml } from '@/lib/sanitize';
import { InteractiveVideoPlayer } from './InteractiveVideoPlayer';
import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  content: string;
  className?: string;
  title?: string;
}

export function RichTextDisplay({ content, className, title = 'Video Interaktif' }: RichTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactiveVideoRoots = useRef<Root[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous roots
    interactiveVideoRoots.current.forEach(root => {
      try { root.unmount(); } catch (e) {}
    });
    interactiveVideoRoots.current = [];

    // Google Slides embed protection: pastikan semua slide tertutup rapi dari tombol Google Slides & garis pemisah
    const slideEmbeds = containerRef.current.querySelectorAll('.slide-embed');
    slideEmbeds.forEach((embed) => {
      if (!embed.querySelector('.slide-blocker')) {
        const blocker = document.createElement('div');
        blocker.className = 'slide-blocker';
        blocker.style.cssText = 'position: absolute; bottom: 0; right: 0; left: 88px; height: 62px; background: #f5f7f8; z-index: 20; cursor: default; pointer-events: auto; border-bottom-right-radius: 0.5rem;';
        embed.appendChild(blocker);
      }
    });

    // Find all embedded interactive video placeholders within this container
    const embeds = containerRef.current.querySelectorAll('.interactive-video-embed');
    embeds.forEach((el) => {
      if (el.hasAttribute('data-rendered')) return;
      
      const dataStr = el.getAttribute('data-interactive-video');
      if (dataStr) {
        try {
          const data = JSON.parse(decodeURIComponent(dataStr));
          el.setAttribute('data-rendered', 'true');
          el.removeAttribute('style');
          el.className = 'interactive-video-container my-6 relative';
          
          const root = createRoot(el);
          interactiveVideoRoots.current.push(root);
          root.render(<InteractiveVideoPlayer data={data} title={title} />);
        } catch (e) {
          console.error("Failed to parse interactive video data", e);
        }
      }
    });

    return () => {
      interactiveVideoRoots.current.forEach(root => {
        try { root.unmount(); } catch (e) {}
      });
      interactiveVideoRoots.current = [];
    };
  }, [content, title]);

  return (
    <div 
      ref={containerRef}
      className={cn("prose prose-sm max-w-none dark:prose-invert bidi-content", className)}
      dir="auto"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}
