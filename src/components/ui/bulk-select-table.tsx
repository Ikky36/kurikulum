import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BulkSelectContextValue {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (ids: string[]) => boolean;
  isSomeSelected: (ids: string[]) => boolean;
  selectionCount: number;
}

const BulkSelectContext = React.createContext<BulkSelectContextValue | undefined>(undefined);

export function useBulkSelect() {
  const context = React.useContext(BulkSelectContext);
  if (!context) {
    throw new Error("useBulkSelect must be used within a BulkSelectProvider");
  }
  return context;
}

interface BulkSelectProviderProps {
  children: React.ReactNode;
}

export function BulkSelectProvider({ children }: BulkSelectProviderProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = React.useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      } else {
        return new Set([...prev, ...ids]);
      }
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = React.useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds]
  );

  const isSomeSelected = React.useCallback(
    (ids: string[]) => ids.some((id) => selectedIds.has(id)) && !ids.every((id) => selectedIds.has(id)),
    [selectedIds]
  );

  const value: BulkSelectContextValue = {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
    selectionCount: selectedIds.size,
  };

  return (
    <BulkSelectContext.Provider value={value}>
      {children}
    </BulkSelectContext.Provider>
  );
}

interface BulkSelectCheckboxProps {
  id: string;
  className?: string;
}

export function BulkSelectCheckbox({ id, className }: BulkSelectCheckboxProps) {
  const { isSelected, toggleSelection } = useBulkSelect();
  
  return (
    <Checkbox
      checked={isSelected(id)}
      onCheckedChange={() => toggleSelection(id)}
      className={cn("data-[state=checked]:bg-primary", className)}
      aria-label={`Select row ${id}`}
    />
  );
}

interface BulkSelectAllCheckboxProps {
  ids: string[];
  className?: string;
}

export function BulkSelectAllCheckbox({ ids, className }: BulkSelectAllCheckboxProps) {
  const { isAllSelected, isSomeSelected, toggleAll } = useBulkSelect();
  
  return (
    <Checkbox
      checked={isAllSelected(ids) ? true : isSomeSelected(ids) ? "indeterminate" : false}
      onCheckedChange={() => toggleAll(ids)}
      className={cn("data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary", className)}
      aria-label="Select all"
    />
  );
}

interface BulkActionBarProps {
  onDelete: (ids: string[]) => Promise<void>;
  itemName?: string;
  className?: string;
}

export function BulkActionBar({ onDelete, itemName = "item", className }: BulkActionBarProps) {
  const { selectedIds, selectionCount, clearSelection } = useBulkSelect();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(Array.from(selectedIds));
      clearSelection();
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (selectionCount === 0) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border shadow-lg rounded-lg px-4 py-3 animate-in slide-in-from-bottom-4 fade-in-0",
          className
        )}
      >
        <span className="text-sm font-medium">
          {selectionCount} {itemName} dipilih
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Hapus
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={isDeleting}
        >
          <X className="h-4 w-4 mr-1" />
          Batal
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus {selectionCount} {itemName}. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
