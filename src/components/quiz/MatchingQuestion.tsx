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
import { GripVertical, Check, X, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MatchingQuestionProps {
  options: {
    left?: string[];
    right?: string[];
    items?: string[];
    matches?: string[];
  } | Array<{ left: string; right: string }>;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
  showResult?: boolean;
  correctMapping?: Record<string, string>;
}

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isMatched?: boolean;
  disabled?: boolean;
}

interface DroppableZoneProps {
  id: string;
  leftItem: string;
  matchedItem?: string;
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  children?: React.ReactNode;
}

function DraggableItem({ id, children, isMatched, disabled }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
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
        "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all",
        disabled ? "cursor-default opacity-70" : "cursor-grab active:cursor-grabbing",
        "bg-card hover:bg-accent hover:border-primary/50",
        isDragging && "shadow-lg ring-2 ring-primary/30",
        isMatched && !disabled && "opacity-50 pointer-events-none"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-medium">{children}</span>
    </div>
  );
}

function DroppableZone({ id, leftItem, matchedItem, disabled, showResult, isCorrect }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200",
        !showResult && isOver && "border-primary bg-primary/10 scale-[1.02]",
        !showResult && !isOver && "border-muted-foreground/30 bg-muted/30",
        !showResult && matchedItem && "border-solid border-primary/50 bg-primary/5",
        showResult && isCorrect && "border-solid border-green-500 bg-green-50 dark:bg-green-950/30",
        showResult && !isCorrect && matchedItem && "border-solid border-red-500 bg-red-50 dark:bg-red-950/30",
        showResult && !isCorrect && !matchedItem && "border-dashed border-red-300 bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      <div className="flex-1">
        <Badge variant="outline" className="mb-2 text-xs">Pertanyaan</Badge>
        <p className="font-medium text-foreground">{leftItem}</p>
      </div>
      
      <ArrowRight className={cn(
        "h-5 w-5 shrink-0 transition-colors",
        showResult && isCorrect && "text-green-600",
        showResult && !isCorrect && "text-red-500",
        !showResult && matchedItem && "text-primary",
        !showResult && !matchedItem && "text-muted-foreground"
      )} />
      
      <div className={cn(
        "flex-1 min-h-[60px] rounded-lg border-2 border-dashed flex items-center justify-center transition-all",
        !showResult && isOver && "border-primary bg-primary/20",
        !showResult && !isOver && "border-muted-foreground/20",
        !showResult && matchedItem && "border-solid border-primary/30 bg-primary/5",
        showResult && isCorrect && "border-solid border-green-500/50 bg-green-100 dark:bg-green-900/30",
        showResult && !isCorrect && matchedItem && "border-solid border-red-500/50 bg-red-100 dark:bg-red-900/30",
        showResult && !isCorrect && !matchedItem && "border-dashed border-red-300/50"
      )}>
        {matchedItem ? (
          <div className="flex items-center gap-2 px-3 py-2">
            {showResult ? (
              isCorrect ? (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-red-600 shrink-0" />
              )
            ) : (
              <Badge variant="secondary" className="shrink-0">Terpasang</Badge>
            )}
            <span className={cn(
              "font-medium",
              showResult && isCorrect && "text-green-700 dark:text-green-400",
              showResult && !isCorrect && "text-red-700 dark:text-red-400",
              !showResult && "text-foreground"
            )}>
              {matchedItem}
            </span>
          </div>
        ) : (
          <span className={cn(
            "text-sm",
            showResult ? "text-red-500" : "text-muted-foreground"
          )}>
            {showResult ? "Tidak dijawab" : "Drop jawaban di sini"}
          </span>
        )}
      </div>
    </div>
  );
}

// Draggable matched item inside drop zone
function DraggableMatchedItem({ 
  id, 
  leftItem,
  matchedItem, 
  disabled, 
  showResult, 
  isCorrect,
  onRemove 
}: { 
  id: string;
  leftItem: string;
  matchedItem: string; 
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `matched-${matchedItem}`,
    disabled: disabled || showResult,
    data: { matchedItem, fromLeftItem: leftItem },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: leftItem,
    disabled: disabled || showResult,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setDropRef}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
        !showResult && isOver && "border-primary bg-primary/10 scale-[1.02]",
        !showResult && !isOver && "border-solid border-primary/50 bg-primary/5",
        showResult && isCorrect && "border-solid border-green-500 bg-green-50 dark:bg-green-950/30",
        showResult && !isCorrect && "border-solid border-red-500 bg-red-50 dark:bg-red-950/30"
      )}
    >
      <div className="flex-1">
        <Badge variant="outline" className="mb-2 text-xs">Pertanyaan</Badge>
        <p className="font-medium text-foreground">{leftItem}</p>
      </div>
      
      <ArrowRight className={cn(
        "h-5 w-5 shrink-0 transition-colors",
        showResult && isCorrect && "text-green-600",
        showResult && !isCorrect && "text-red-500",
        !showResult && "text-primary"
      )} />
      
      <div
        ref={setNodeRef}
        style={style}
        {...(disabled || showResult ? {} : { ...listeners, ...attributes })}
        onClick={() => !disabled && !showResult && onRemove()}
        className={cn(
          "flex-1 min-h-[60px] rounded-lg border-2 flex items-center justify-center transition-all px-3 py-2",
          !showResult && !disabled && "cursor-grab active:cursor-grabbing hover:bg-accent",
          !showResult && "border-solid border-primary/30 bg-primary/5",
          showResult && isCorrect && "border-solid border-green-500/50 bg-green-100 dark:bg-green-900/30",
          showResult && !isCorrect && "border-solid border-red-500/50 bg-red-100 dark:bg-red-900/30",
          isDragging && "shadow-lg ring-2 ring-primary/30"
        )}
      >
        <div className="flex items-center gap-2">
          {!showResult && !disabled && (
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          {showResult && (
            isCorrect ? (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-red-600 shrink-0" />
            )
          )}
          <span className={cn(
            "font-medium",
            showResult && isCorrect && "text-green-700 dark:text-green-400",
            showResult && !isCorrect && "text-red-700 dark:text-red-400",
            !showResult && "text-foreground"
          )}>
            {matchedItem}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MatchingQuestion({ 
  options, 
  value, 
  onChange, 
  disabled = false,
  showResult = false,
  correctMapping
}: MatchingQuestionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFromMatched, setActiveFromMatched] = useState<string | null>(null);

  // Handle different data formats
  let leftItems: string[] = [];
  let rightItems: string[] = [];
  let expectedMapping: Record<string, string> = {};

  if (Array.isArray(options)) {
    leftItems = options.map((pair: { left: string; right: string }) => pair.left);
    rightItems = options.map((pair: { left: string; right: string }) => pair.right);
    options.forEach((pair: { left: string; right: string }) => {
      expectedMapping[pair.left] = pair.right;
    });
  } else if (options) {
    leftItems = options.left || options.items || [];
    rightItems = options.right || options.matches || [];
  }

  // Use provided correctMapping or build from options
  const finalCorrectMapping = correctMapping || expectedMapping;

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
    const id = event.active.id as string;
    if (id.startsWith('matched-')) {
      setActiveFromMatched(id.replace('matched-', ''));
      setActiveId(id.replace('matched-', ''));
    } else {
      setActiveId(id);
      setActiveFromMatched(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveFromMatched(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    
    // Handle dragging from matched zone
    if (activeIdStr.startsWith('matched-')) {
      const draggedItem = activeIdStr.replace('matched-', '');
      const dropZone = overIdStr;
      
      if (leftItems.includes(dropZone)) {
        const newValue = { ...value };
        // Remove from old position
        Object.keys(newValue).forEach(key => {
          if (newValue[key] === draggedItem) {
            delete newValue[key];
          }
        });
        // Add to new position
        newValue[dropZone] = draggedItem;
        onChange(newValue);
      }
    } else {
      // Handle dragging from unmatched pool
      const draggedItem = activeIdStr;
      const dropZone = overIdStr;
      
      if (leftItems.includes(dropZone)) {
        const newValue = { ...value };
        Object.keys(newValue).forEach(key => {
          if (newValue[key] === draggedItem) {
            delete newValue[key];
          }
        });
        newValue[dropZone] = draggedItem;
        onChange(newValue);
      }
    }
  }, [leftItems, value, onChange]);

  const handleRemoveMatch = (leftItem: string) => {
    if (disabled || showResult) return;
    const newValue = { ...value };
    delete newValue[leftItem];
    onChange(newValue);
  };

  const activeItem = activeId ? rightItems.find(item => item === activeId) : null;

  const checkPairCorrect = (leftItem: string): boolean => {
    if (!finalCorrectMapping[leftItem]) return false;
    return value[leftItem] === finalCorrectMapping[leftItem];
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {showResult 
            ? "Hasil jawaban Anda:" 
            : "Seret jawaban dari kotak di bawah ke pasangan yang benar. Klik pasangan untuk melepas."}
        </p>

        {/* Drop zones */}
        <div className="space-y-3">
          {leftItems.map((leftItem, idx) => {
            const matchedItem = value[leftItem];
            const isCorrect = checkPairCorrect(leftItem);

            if (matchedItem) {
              return (
                <DraggableMatchedItem
                  key={idx}
                  id={leftItem}
                  leftItem={leftItem}
                  matchedItem={matchedItem}
                  disabled={disabled}
                  showResult={showResult}
                  isCorrect={isCorrect}
                  onRemove={() => handleRemoveMatch(leftItem)}
                />
              );
            }

            return (
              <DroppableZone
                key={idx}
                id={leftItem}
                leftItem={leftItem}
                matchedItem={undefined}
                disabled={disabled}
                showResult={showResult}
                isCorrect={false}
              />
            );
          })}
        </div>

        {/* Show correct answers after checking */}
        {showResult && (
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <p className="font-medium text-sm flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Jawaban Benar:
            </p>
            {leftItems.map((leftItem, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-background rounded">{leftItem}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-green-700 dark:text-green-300">
                  {finalCorrectMapping[leftItem] || '-'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Draggable items */}
        {!showResult && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Pilihan Jawaban:</p>
            <div className="flex flex-wrap gap-3">
              {unmatchedRightItems.map((rightItem, idx) => (
                <DraggableItem 
                  key={idx} 
                  id={rightItem}
                  isMatched={false}
                  disabled={disabled}
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
        )}

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
