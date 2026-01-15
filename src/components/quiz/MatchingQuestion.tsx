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
import { GripVertical, Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MatchingQuestionProps {
  options: {
    left?: string[];
    right?: string[];
    items?: string[];
    matches?: string[];
  };
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isMatched?: boolean;
}

interface DroppableZoneProps {
  id: string;
  leftItem: string;
  matchedItem?: string;
  children?: React.ReactNode;
}

function DraggableItem({ id, children, isMatched }: DraggableItemProps) {
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
        "flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all",
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

function DroppableZone({ id, leftItem, matchedItem }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200",
        isOver ? "border-primary bg-primary/10 scale-[1.02]" : "border-muted-foreground/30 bg-muted/30",
        matchedItem && "border-solid border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex-1">
        <Badge variant="outline" className="mb-2 text-xs">Pertanyaan</Badge>
        <p className="font-medium text-foreground">{leftItem}</p>
      </div>
      
      <ArrowRight className={cn(
        "h-5 w-5 shrink-0 transition-colors",
        matchedItem ? "text-primary" : "text-muted-foreground"
      )} />
      
      <div className={cn(
        "flex-1 min-h-[60px] rounded-lg border-2 border-dashed flex items-center justify-center transition-all",
        isOver ? "border-primary bg-primary/20" : "border-muted-foreground/20",
        matchedItem && "border-solid border-primary/30 bg-primary/5"
      )}>
        {matchedItem ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Badge variant="secondary" className="shrink-0">Terpasang</Badge>
            <span className="font-medium text-foreground">{matchedItem}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Drop jawaban di sini</span>
        )}
      </div>
    </div>
  );
}

export function MatchingQuestion({ options, value, onChange }: MatchingQuestionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Handle different data formats
  // Format 1: { left: string[], right: string[] }
  // Format 2: Array of { left: string, right: string } pairs
  let leftItems: string[] = [];
  let rightItems: string[] = [];

  if (Array.isArray(options)) {
    // Format 2: Array of pairs like [{left: "A", right: "1"}, {left: "B", right: "2"}]
    leftItems = options.map((pair: { left: string; right: string }) => pair.left);
    rightItems = options.map((pair: { left: string; right: string }) => pair.right);
  } else if (options) {
    // Format 1: { left: string[], right: string[] }
    leftItems = options.left || options.items || [];
    rightItems = options.right || options.matches || [];
  }

  // Get unmatched right items
  const matchedRightItems = Object.values(value);
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
        // Remove previous match for this right item
        const newValue = { ...value };
        Object.keys(newValue).forEach(key => {
          if (newValue[key] === draggedItem) {
            delete newValue[key];
          }
        });
        // Set new match
        newValue[dropZone] = draggedItem;
        onChange(newValue);
      }
    }
  }, [leftItems, value, onChange]);

  const handleRemoveMatch = (leftItem: string) => {
    const newValue = { ...value };
    delete newValue[leftItem];
    onChange(newValue);
  };

  const activeItem = activeId ? rightItems.find(item => item === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Seret jawaban dari kotak di bawah ke pasangan yang benar.
        </p>

        {/* Drop zones */}
        <div className="space-y-3">
          {leftItems.map((leftItem, idx) => (
            <div key={idx} onClick={() => value[leftItem] && handleRemoveMatch(leftItem)}>
              <DroppableZone
                id={leftItem}
                leftItem={leftItem}
                matchedItem={value[leftItem]}
              />
            </div>
          ))}
        </div>

        {/* Draggable items */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3 text-muted-foreground">Pilihan Jawaban:</p>
          <div className="flex flex-wrap gap-3">
            {unmatchedRightItems.map((rightItem, idx) => (
              <DraggableItem 
                key={idx} 
                id={rightItem}
                isMatched={matchedRightItems.includes(rightItem)}
              >
                {rightItem}
              </DraggableItem>
            ))}
            {unmatchedRightItems.length === 0 && (
              <p className="text-sm text-primary flex items-center gap-2">
                <Check className="h-4 w-4" />
                Semua jawaban sudah dipasangkan!
              </p>
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-primary bg-card shadow-xl">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{activeItem}</span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
