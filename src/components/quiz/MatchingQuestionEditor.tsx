import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, Trash2, ArrowRight, Check, Shuffle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MatchingPair {
  left: string;
  right: string;
}

interface MatchingQuestionEditorProps {
  pairs: MatchingPair[];
  onChange: (pairs: MatchingPair[]) => void;
}

interface DraggableRightItemProps {
  id: string;
  children: React.ReactNode;
  isMatched?: boolean;
}

interface DroppableLeftItemProps {
  id: string;
  leftText: string;
  matchedRight?: string;
  onRemoveMatch: () => void;
}

function DraggableRightItem({ id, children, isMatched }: DraggableRightItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all text-sm",
        "bg-card hover:bg-accent hover:border-primary/50",
        isDragging && "shadow-lg ring-2 ring-primary/30",
        isMatched && "opacity-50 pointer-events-none"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-medium">{children}</span>
    </div>
  );
}

function DroppableLeftItem({ id, leftText, matchedRight, onRemoveMatch }: DroppableLeftItemProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all duration-200",
        isOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-muted-foreground/30 bg-muted/30",
        matchedRight && "border-solid border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex-1 min-w-0">
        <Badge variant="outline" className="mb-1 text-xs">Pertanyaan</Badge>
        <p className="font-medium text-foreground truncate">{leftText}</p>
      </div>
      
      <ArrowRight className={cn(
        "h-4 w-4 shrink-0 transition-colors",
        matchedRight ? "text-primary" : "text-muted-foreground"
      )} />
      
      <div 
        className={cn(
          "flex-1 min-h-[50px] rounded-lg border-2 border-dashed flex items-center justify-center transition-all cursor-pointer",
          isOver ? "border-primary bg-primary/20" : "border-muted-foreground/20",
          matchedRight && "border-solid border-green-500/50 bg-green-50 dark:bg-green-950/30"
        )}
        onClick={() => matchedRight && onRemoveMatch()}
      >
        {matchedRight ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400 text-sm">{matchedRight}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Drop jawaban di sini</span>
        )}
      </div>
    </div>
  );
}

export function MatchingQuestionEditor({ pairs, onChange }: MatchingQuestionEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>(() => {
    // Initialize with existing pairs
    const initial: Record<string, string> = {};
    pairs.forEach(p => {
      if (p.left && p.right) {
        initial[p.left] = p.right;
      }
    });
    return initial;
  });

  const leftItems = pairs.map(p => p.left).filter(Boolean);
  const rightItems = pairs.map(p => p.right).filter(Boolean);
  
  // Get unmatched right items
  const matchedRightItems = Object.values(matchedPairs);
  const unmatchedRightItems = rightItems.filter(item => !matchedRightItems.includes(item));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const draggedItem = active.id as string;
      const dropZone = over.id as string;
      
      // Check if dropped on a valid drop zone (left item)
      if (leftItems.includes(dropZone)) {
        const newMatched = { ...matchedPairs };
        // Remove previous match for this right item
        Object.keys(newMatched).forEach(key => {
          if (newMatched[key] === draggedItem) {
            delete newMatched[key];
          }
        });
        // Set new match
        newMatched[dropZone] = draggedItem;
        setMatchedPairs(newMatched);
        
        // Update pairs to reflect new matching
        const newPairs = pairs.map(p => {
          if (p.left === dropZone) {
            return { ...p, right: draggedItem };
          }
          return p;
        });
        onChange(newPairs);
      }
    }
  }, [leftItems, matchedPairs, pairs, onChange]);

  const handleRemoveMatch = (leftItem: string) => {
    const newMatched = { ...matchedPairs };
    delete newMatched[leftItem];
    setMatchedPairs(newMatched);
  };

  const handleAddPair = () => {
    onChange([...pairs, { left: '', right: '' }]);
  };

  const handleRemovePair = (index: number) => {
    const removedPair = pairs[index];
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange(newPairs);
    
    // Also remove from matched pairs
    if (removedPair.left && matchedPairs[removedPair.left]) {
      const newMatched = { ...matchedPairs };
      delete newMatched[removedPair.left];
      setMatchedPairs(newMatched);
    }
  };

  const handlePairChange = (index: number, field: 'left' | 'right', value: string) => {
    const oldValue = pairs[index][field];
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);

    // Update matched pairs if left changed
    if (field === 'left' && oldValue && matchedPairs[oldValue]) {
      const newMatched = { ...matchedPairs };
      const rightVal = newMatched[oldValue];
      delete newMatched[oldValue];
      if (value) {
        newMatched[value] = rightVal;
      }
      setMatchedPairs(newMatched);
    }
  };

  const handleShuffleRight = () => {
    // Shuffle right items randomly
    const shuffled = [...rightItems].sort(() => Math.random() - 0.5);
    const newPairs = pairs.map((p, i) => ({
      ...p,
      right: shuffled[i] || p.right
    }));
    onChange(newPairs);
    
    // Reset matched pairs for testing
    setMatchedPairs({});
  };

  const activeItem = activeId ? rightItems.find(item => item === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Pasangan Menjodohkan</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffleRight}
            disabled={rightItems.length < 2}
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Acak
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddPair}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Pasangan
          </Button>
        </div>
      </div>

      {/* Input fields for pairs */}
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm text-muted-foreground">Masukkan pasangan pertanyaan dan jawaban:</p>
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-sm font-medium text-muted-foreground">{idx + 1}.</span>
            <Input
              value={pair.left}
              onChange={(e) => handlePairChange(idx, 'left', e.target.value)}
              placeholder="Pertanyaan/Item"
              className="flex-1"
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={pair.right}
              onChange={(e) => handlePairChange(idx, 'right', e.target.value)}
              placeholder="Jawaban/Pasangan"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemovePair(idx)}
              disabled={pairs.length <= 2}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Drag and Drop Preview */}
      {leftItems.length > 0 && rightItems.length > 0 && leftItems.every(l => l) && rightItems.every(r => r) && (
        <div className="space-y-4 p-4 border rounded-lg bg-background">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview Drag & Drop:</p>
            <Badge variant="outline" className="text-xs">
              {Object.keys(matchedPairs).length}/{leftItems.length} dipasangkan
            </Badge>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Drop zones */}
            <div className="space-y-2">
              {leftItems.map((leftItem, idx) => (
                <DroppableLeftItem
                  key={idx}
                  id={leftItem}
                  leftText={leftItem}
                  matchedRight={matchedPairs[leftItem]}
                  onRemoveMatch={() => handleRemoveMatch(leftItem)}
                />
              ))}
            </div>

            {/* Draggable items */}
            <div className="pt-3 border-t mt-4">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Pilihan Jawaban (seret ke atas):</p>
              <div className="flex flex-wrap gap-2">
                {unmatchedRightItems.map((rightItem, idx) => (
                  <DraggableRightItem 
                    key={idx} 
                    id={rightItem}
                    isMatched={matchedRightItems.includes(rightItem)}
                  >
                    {rightItem}
                  </DraggableRightItem>
                ))}
                {unmatchedRightItems.length === 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Semua sudah dipasangkan
                  </p>
                )}
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeItem ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-primary bg-card shadow-xl text-sm">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{activeItem}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
