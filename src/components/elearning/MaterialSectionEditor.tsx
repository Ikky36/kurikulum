import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, BookOpen, HelpCircle, X } from 'lucide-react';
import { AdvancedRichEditor } from './AdvancedRichEditor';
import { AIContentGenerator } from './AIContentGenerator';
import { useElearningAssignments } from '@/hooks/useElearningMaterials';

export interface SectionQuiz {
  assignmentId: string;
  title: string;
}

export interface MaterialSection {
  id: string;
  title: string;
  content: string;
  quizBefore?: SectionQuiz | null;
  quizAfter?: SectionQuiz | null;
}

interface MaterialSectionEditorProps {
  sections: MaterialSection[];
  onChange: (sections: MaterialSection[]) => void;
  courseId: string;
  classId?: string;
  lloData?: { code: string; description: string; indikator?: string[] } | null;
}

export function MaterialSectionEditor({ 
  sections, 
  onChange, 
  courseId,
  classId,
  lloData 
}: MaterialSectionEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAIForSection, setShowAIForSection] = useState<string | null>(null);
  
  const { data: assignments } = useElearningAssignments(classId || '');
  const quizAssignments = (assignments || []).filter((a: any) => a.assignment_type === 'quiz');

  const generateId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addSection = () => {
    const newSection: MaterialSection = {
      id: generateId(),
      title: `Section ${sections.length + 1}`,
      content: '',
      quizBefore: null,
      quizAfter: null,
    };
    onChange([...sections, newSection]);
    setExpandedSections(prev => new Set([...prev, newSection.id]));
  };

  const updateSection = (id: string, updates: Partial<MaterialSection>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id));
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onChange(newSections);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAIGenerated = (sectionId: string, content: string) => {
    updateSection(sectionId, { content });
    setShowAIForSection(null);
  };

  const handleQuizChange = (sectionId: string, position: 'before' | 'after', quizId: string) => {
    const quiz = quizAssignments.find((q: any) => q.id === quizId);
    if (position === 'before') {
      updateSection(sectionId, { 
        quizBefore: quizId && quiz ? { assignmentId: quizId, title: quiz.title } : null 
      });
    } else {
      updateSection(sectionId, { 
        quizAfter: quizId && quiz ? { assignmentId: quizId, title: quiz.title } : null 
      });
    }
  };

  const removeQuiz = (sectionId: string, position: 'before' | 'after') => {
    if (position === 'before') {
      updateSection(sectionId, { quizBefore: null });
    } else {
      updateSection(sectionId, { quizAfter: null });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Section Materi ({sections.length})
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Belum ada section. Tambahkan section untuk mengorganisir materi.
            </p>
            <Button type="button" variant="outline" onClick={addSection} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Section Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <Card key={section.id} className="overflow-hidden">
              <Collapsible 
                open={expandedSections.has(section.id)} 
                onOpenChange={() => toggleSection(section.id)}
              >
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                        disabled={index === sections.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Badge variant="secondary" className="shrink-0">
                      {index + 1}
                    </Badge>
                    
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="flex-1 h-8 font-medium"
                      placeholder="Judul section..."
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Quiz indicators */}
                    <div className="flex items-center gap-1">
                      {section.quizBefore && (
                        <Badge variant="outline" className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <HelpCircle className="h-3 w-3" />
                          Quiz Before
                        </Badge>
                      )}
                      {section.quizAfter && (
                        <Badge variant="outline" className="gap-1 text-xs bg-green-50 text-green-700 border-green-200">
                          <HelpCircle className="h-3 w-3" />
                          Quiz After
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.has(section.id) ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-4 space-y-4">
                    {/* Quiz Before Section */}
                    {classId && quizAssignments.length > 0 && (
                      <div className="space-y-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
                        <Label className="text-sm flex items-center gap-2 text-blue-700">
                          <HelpCircle className="h-4 w-4" />
                          Quiz Sebelum Section
                        </Label>
                        {section.quizBefore ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                              {section.quizBefore.title}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeQuiz(section.id, 'before')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value="" 
                            onValueChange={(v) => handleQuizChange(section.id, 'before', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Pilih quiz..." />
                            </SelectTrigger>
                            <SelectContent>
                              {quizAssignments.map((q: any) => (
                                <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {/* AI Generator for this section */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAIForSection(showAIForSection === section.id ? null : section.id)}
                        className="gap-2 text-primary border-primary/30"
                      >
                        <Sparkles className="h-4 w-4" />
                        {showAIForSection === section.id ? 'Tutup AI' : 'Generate dengan AI'}
                      </Button>
                    </div>
                    
                    {showAIForSection === section.id && (
                      <AIContentGenerator
                        type="material"
                        onGenerated={(content) => handleAIGenerated(section.id, content)}
                        defaultTopic={`Section: ${section.title}${lloData ? ` - ${lloData.code}: ${lloData.description}` : ''}`}
                        indicators={lloData?.indikator || []}
                        lloData={lloData}
                      />
                    )}
                    
                    <AdvancedRichEditor 
                      value={section.content} 
                      onChange={(content) => updateSection(section.id, { content })} 
                    />

                    {/* Quiz After Section */}
                    {classId && quizAssignments.length > 0 && (
                      <div className="space-y-2 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                        <Label className="text-sm flex items-center gap-2 text-green-700">
                          <HelpCircle className="h-4 w-4" />
                          Quiz Setelah Section
                        </Label>
                        {section.quizAfter ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                              {section.quizAfter.title}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeQuiz(section.id, 'after')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value="" 
                            onValueChange={(v) => handleQuizChange(section.id, 'after', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Pilih quiz..." />
                            </SelectTrigger>
                            <SelectContent>
                              {quizAssignments.map((q: any) => (
                                <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
