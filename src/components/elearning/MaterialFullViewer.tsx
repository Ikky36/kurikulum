import { useState, useEffect } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  X, 
  BookOpen, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  CheckCircle2,
  List,
  Paperclip,
  FileText,
  Image,
  File,
  ExternalLink,
  Download
} from 'lucide-react';
import { MaterialQuiz } from './MaterialQuiz';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { MaterialSection } from './MaterialSectionEditor';
import type { SectionFile } from './SectionFileUploader';
import { InteractiveVideoPlayer } from './InteractiveVideoPlayer';
import { RichTextDisplay } from './RichTextDisplay';

interface MaterialFullViewerProps {
  material: {
    id: string;
    title: string;
    content?: string | null;
    sections?: MaterialSection[] | null;
    llo?: { id: string; code: string; description: string } | null;
  };
  onClose: () => void;
}

type NavigationItem = {
  id: string;
  type: 'section' | 'quiz-before' | 'quiz-after';
  title: string;
  sectionIndex?: number;
  quizId?: string;
  quizTitle?: string;
};

export function MaterialFullViewer({ material, onClose }: MaterialFullViewerProps) {
  const isMobile = useIsMobile();
  // Desktop: sidebar terbuka secara default, Mobile: tertutup
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  
  // Update sidebar state when switching between mobile/desktop
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Build navigation items from sections
  const navigationItems: NavigationItem[] = [];
  const sections = material.sections || [];
  
  sections.forEach((section, index) => {
    // Quiz before section
    if (section.quizBefore) {
      navigationItems.push({
        id: `quiz-before-${section.id}`,
        type: 'quiz-before',
        title: `Quiz: ${section.quizBefore.title}`,
        sectionIndex: index,
        quizId: section.quizBefore.assignmentId,
        quizTitle: section.quizBefore.title,
      });
    }
    
    // Section content
    navigationItems.push({
      id: section.id,
      type: 'section',
      title: section.title,
      sectionIndex: index,
    });
    
    // Quiz after section
    if (section.quizAfter) {
      navigationItems.push({
        id: `quiz-after-${section.id}`,
        type: 'quiz-after',
        title: `Quiz: ${section.quizAfter.title}`,
        sectionIndex: index,
        quizId: section.quizAfter.assignmentId,
        quizTitle: section.quizAfter.title,
      });
    }
  });

  // Set initial active item
  useEffect(() => {
    if (navigationItems.length > 0 && !activeItemId) {
      setActiveItemId(navigationItems[0].id);
    }
  }, [navigationItems, activeItemId]);

  const activeItem = navigationItems.find(item => item.id === activeItemId);
  const activeIndex = navigationItems.findIndex(item => item.id === activeItemId);

  const handleNext = () => {
    if (activeIndex < navigationItems.length - 1) {
      // Mark current as completed
      setCompletedItems(prev => new Set([...prev, activeItemId]));
      setActiveItemId(navigationItems[activeIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveItemId(navigationItems[activeIndex - 1].id);
    }
  };

  const handleQuizComplete = (score: number) => {
    setCompletedItems(prev => new Set([...prev, activeItemId]));
  };

  const getActiveSection = () => {
    if (activeItem?.type === 'section') {
      return sections.find(s => s.id === activeItem.id);
    }
    return null;
  };

  const handleNavigate = (itemId: string) => {
    setActiveItemId(itemId);
    setSidebarOpen(false);
  };

  // If no sections, show single content mode
  if (sections.length === 0 && material.content) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold text-base sm:text-lg truncate">{material.title}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-8">
            {material.llo && (
              <Card className="bg-primary/5 border-primary/20 mb-6">
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="font-medium">Sub-CPMK:</span> {material.llo.code} - {material.llo.description}
                  </p>
                </CardContent>
              </Card>
            )}
            <div 
              className="prose prose-sm sm:prose-base max-w-none dark:prose-invert bidi-content"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(material.content || '') }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Mobile Sheet Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[85%] max-w-sm p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left flex items-center gap-2">
                <List className="h-5 w-5" />
                <span className="truncate">{material.title}</span>
              </SheetTitle>
              {material.llo && (
                <Badge variant="secondary" className="w-fit mt-1">
                  {material.llo.code}
                </Badge>
              )}
            </SheetHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  {navigationItems.map((item) => {
                    const isActive = item.id === activeItemId;
                    const isCompleted = completedItems.has(item.id);
                    const isQuiz = item.type === 'quiz-before' || item.type === 'quiz-after';
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-lg mb-1 transition-colors flex items-center gap-3",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted active:bg-muted",
                          isQuiz && !isActive && "text-muted-foreground"
                        )}
                      >
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : isQuiz ? (
                            <HelpCircle className="h-5 w-5" />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {(item.sectionIndex ?? 0) + 1}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium line-clamp-2">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Progress */}
              <div className="p-4 border-t bg-background shrink-0">
                <div className="text-xs text-muted-foreground mb-2">
                  Progress: {completedItems.size}/{navigationItems.length}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(completedItems.size / navigationItems.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar - Always visible when open */}
      {!isMobile && sidebarOpen && (
        <div className="w-80 h-full bg-muted/30 border-r flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-background shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold truncate">{material.title}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {material.llo && (
              <Badge variant="secondary" className="mt-2">
                {material.llo.code}
              </Badge>
            )}
          </div>
          
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              {navigationItems.map((item) => {
                const isActive = item.id === activeItemId;
                const isCompleted = completedItems.has(item.id);
                const isQuiz = item.type === 'quiz-before' || item.type === 'quiz-after';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg mb-1 transition-colors flex items-center gap-3",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted active:bg-muted",
                      isQuiz && !isActive && "text-muted-foreground"
                    )}
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : isQuiz ? (
                        <HelpCircle className="h-5 w-5" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {(item.sectionIndex ?? 0) + 1}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium line-clamp-2">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Progress */}
          <div className="p-4 border-t bg-background shrink-0">
            <div className="text-xs text-muted-foreground mb-2">
              Progress: {completedItems.size}/{navigationItems.length}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${(completedItems.size / navigationItems.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Badge variant="outline" className="shrink-0 text-xs">
              {activeIndex + 1}/{navigationItems.length}
            </Badge>
            {activeItem && (
              <span className="font-medium truncate text-sm sm:text-base hidden sm:block">
                {activeItem.title}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile: Show current section title */}
        {isMobile && activeItem && (
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <p className="text-sm font-medium truncate">{activeItem.title}</p>
          </div>
        )}
        
        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-8">
            {activeItem?.type === 'section' && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{activeItem.title}</h1>

                {/* Legacy Interactive Video Support */}
                {getActiveSection()?.interactiveVideo?.url && (
                  <div className="mb-6">
                    <InteractiveVideoPlayer
                      data={getActiveSection()!.interactiveVideo!}
                      title={activeItem.title}
                    />
                  </div>
                )}

                <RichTextDisplay content={getActiveSection()?.content || ''} title={activeItem.title} />
                
                {/* Section Files */}
                {getActiveSection()?.files && getActiveSection()!.files!.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">File Sumber Materi</h3>
                      <Badge variant="secondary">{getActiveSection()!.files!.length} file</Badge>
                    </div>
                    <div className="grid gap-2">
                      {getActiveSection()!.files!.map((file: SectionFile) => {
                        const getFileIcon = (type: string) => {
                          if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
                          if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
                          return <File className="h-5 w-5 text-muted-foreground" />;
                        };
                        
                        const formatFileSize = (bytes: number) => {
                          if (bytes < 1024) return `${bytes} B`;
                          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                        };
                        
                        return (
                          <Card key={file.id} className="bg-muted/50">
                            <CardContent className="p-3 flex items-center gap-3">
                              {getFileIcon(file.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(file.url, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  asChild
                                >
                                  <a href={file.url} download={file.name}>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {(activeItem?.type === 'quiz-before' || activeItem?.type === 'quiz-after') && activeItem.quizId && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{activeItem.quizTitle}</h1>
                <MaterialQuiz
                  assignmentId={activeItem.quizId}
                  assignmentTitle={activeItem.quizTitle || 'Quiz'}
                  onComplete={handleQuizComplete}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t bg-background shrink-0 gap-2">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handlePrevious}
            disabled={activeIndex === 0}
            className="gap-1 sm:gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Sebelumnya</span>
          </Button>
          
          {/* Mobile: Floating menu button */}
          {isMobile && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="gap-1"
            >
              <List className="h-4 w-4" />
              <span className="text-xs">Daftar Isi</span>
            </Button>
          )}
          
          {activeIndex < navigationItems.length - 1 ? (
            <Button 
              onClick={handleNext} 
              size={isMobile ? "sm" : "default"}
              className="gap-1 sm:gap-2"
            >
              <span className="hidden xs:inline">Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={onClose} 
              variant="default" 
              size={isMobile ? "sm" : "default"}
              className="gap-1 sm:gap-2"
            >
              <span className="hidden xs:inline">Selesai</span>
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
