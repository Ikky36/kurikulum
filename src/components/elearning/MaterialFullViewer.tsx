import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  BookOpen, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  CheckCircle2
} from 'lucide-react';
import { MaterialQuiz } from './MaterialQuiz';
import { containsArabic } from '@/components/ui/arabic-text';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { MaterialSection } from './MaterialSectionEditor';

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
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

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

  // If no sections, show single content mode
  if (sections.length === 0 && material.content) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg truncate">{material.title}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
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
              className="prose prose-sm max-w-none dark:prose-invert bidi-content"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: material.content || '' }}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Sidebar */}
      <div className={cn(
        "h-full bg-muted/30 border-r flex flex-col transition-all duration-300",
        sidebarOpen ? "w-80" : "w-0",
        isMobile && sidebarOpen && "absolute z-10 shadow-xl"
      )}>
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b bg-background shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold truncate">{material.title}</h2>
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {material.llo && (
                <Badge variant="secondary" className="mt-2">
                  {material.llo.code}
                </Badge>
              )}
            </div>
            
            {/* Navigation Items */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {navigationItems.map((item, index) => {
                  const isActive = item.id === activeItemId;
                  const isCompleted = completedItems.has(item.id);
                  const isQuiz = item.type === 'quiz-before' || item.type === 'quiz-after';
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveItemId(item.id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-center gap-2",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted",
                        isQuiz && !isActive && "text-muted-foreground"
                      )}
                    >
                      <div className="shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isQuiz ? (
                          <HelpCircle className="h-4 w-4" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(item.sectionIndex ?? 0) + 1}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-sm">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            
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
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">
              {activeIndex + 1} / {navigationItems.length}
            </span>
            {activeItem && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <span className="font-medium truncate">{activeItem.title}</span>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-6">
            {activeItem?.type === 'section' && (
              <div>
                <h1 className="text-2xl font-bold mb-6">{activeItem.title}</h1>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert bidi-content"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: getActiveSection()?.content || '' }}
                />
              </div>
            )}
            
            {(activeItem?.type === 'quiz-before' || activeItem?.type === 'quiz-after') && activeItem.quizId && (
              <div>
                <h1 className="text-2xl font-bold mb-6">{activeItem.quizTitle}</h1>
                <MaterialQuiz
                  assignmentId={activeItem.quizId}
                  assignmentTitle={activeItem.quizTitle || 'Quiz'}
                  onComplete={handleQuizComplete}
                />
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={activeIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          
          {activeIndex < navigationItems.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onClose} variant="default" className="gap-2">
              Selesai
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
