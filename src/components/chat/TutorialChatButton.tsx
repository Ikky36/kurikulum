import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = 'tutorial-chat-position';

const getInitialPosition = (): Position => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { x: window.innerWidth - 80, y: window.innerHeight - 140 };
};

export function TutorialChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya asisten tutorial untuk aplikasi ini. Ada yang bisa saya bantu tentang cara menggunakan fitur-fitur di aplikasi ini?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draggable state
  const [position, setPosition] = useState<Position>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save position to localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
    setIsDragging(true);
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 56, clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, clientY - dragOffset.current.y));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const now = Date.now();
    if (rateLimitedUntil && now < rateLimitedUntil) {
      const waitSeconds = Math.ceil((rateLimitedUntil - now) / 1000);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Layanan AI sedang sibuk. Silakan tunggu ${waitSeconds} detik lalu coba lagi.`,
        },
      ]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = [...messages, { role: 'user' as const, content: userMessage }].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('tutorial-chat', {
        body: { message: userMessage, history },
      });

      if (error) {
        const status = (error as any)?.context?.status as number | undefined;

        if (status === 429) {
          setRateLimitedUntil(Date.now() + 60_000);
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'AI sedang sibuk (terlalu banyak permintaan). Silakan tunggu 30–60 detik lalu coba lagi.',
            },
          ]);
          return;
        }

        throw error;
      }

      if ((data as any)?.code === 429) {
        const retryAfterSeconds = Number((data as any)?.retry_after_seconds || 60);
        setRateLimitedUntil(Date.now() + retryAfterSeconds * 1000);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              (data as any)?.error ||
              'AI sedang sibuk (terlalu banyak permintaan). Silakan tunggu 30–60 detik lalu coba lagi.',
          },
        ]);
        return;
      }

      if ((data as any)?.error) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: (data as any).error,
          },
        ]);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: (data as any)?.response || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.',
        },
      ]);
    } catch (error: any) {
      console.error('Tutorial chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Maaf, terjadi kesalahan: ${error.message || 'Tidak dapat terhubung ke AI'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Calculate chat panel position based on button position
  const getChatPosition = () => {
    const panelWidth = isMinimized ? 288 : 384; // w-72 = 288px, w-96 = 384px
    const panelHeight = isMinimized ? 56 : 500;
    
    let left = position.x - panelWidth + 56;
    let top = position.y - panelHeight - 8;
    
    // Ensure panel stays within viewport
    if (left < 8) left = 8;
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
    if (top < 8) top = position.y + 64;
    
    return { left, top };
  };

  if (!isOpen) {
    return (
      <Button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onClick={(e) => {
          // Only open if not dragging
          if (!isDragging) {
            setIsOpen(true);
          }
        }}
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full shadow-lg transition-transform bg-primary hover:bg-primary/90",
          isDragging ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-105"
        )}
        style={{
          left: position.x,
          top: position.y,
          touchAction: 'none'
        }}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  const chatPosition = getChatPosition();

  return (
    <>
      {/* Draggable button when chat is open */}
      <Button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full shadow-lg transition-transform bg-primary hover:bg-primary/90",
          isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
        )}
        style={{
          left: position.x,
          top: position.y,
          touchAction: 'none'
        }}
        size="icon"
      >
        <GripVertical className="h-5 w-5" />
      </Button>

      {/* Chat panel */}
      <div 
        ref={containerRef}
        className={cn(
          "fixed z-40 bg-background border rounded-lg shadow-2xl transition-all duration-300",
          isMinimized ? "w-72 h-14" : "w-96 h-[500px] max-h-[80vh]"
        )}
        style={{
          left: chatPosition.left,
          top: chatPosition.top
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-medium text-sm">Bantuan Tutorial</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-primary-foreground/20 text-primary-foreground"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-primary-foreground/20 text-primary-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 h-[calc(100%-110px)]" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya tentang cara menggunakan aplikasi..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
