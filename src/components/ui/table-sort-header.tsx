import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface TableSortHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (config: SortConfig) => void;
  sortType?: 'text' | 'number';
  className?: string;
  // Category filter options
  filterOptions?: string[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
}

export function TableSortHeader({
  children,
  sortKey,
  currentSort,
  onSort,
  sortType = 'text',
  className,
  filterOptions,
  filterValue,
  onFilterChange,
  filterPlaceholder = "Filter...",
}: TableSortHeaderProps) {
  const [open, setOpen] = useState(false);
  
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;
  const hasFilter = filterValue && filterValue !== '' && filterValue !== 'all';

  const handleSort = (dir: SortDirection) => {
    onSort({ key: sortKey, direction: dir });
    if (!filterOptions) setOpen(false);
  };

  const getSortIcon = () => {
    if (!isActive || !direction) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return direction === 'asc' 
      ? <ArrowUp className="h-3 w-3" /> 
      : <ArrowDown className="h-3 w-3" />;
  };

  const getSortLabels = () => {
    if (sortType === 'number') {
      return { asc: 'Terkecil ke Terbesar', desc: 'Terbesar ke Terkecil' };
    }
    return { asc: 'A → Z', desc: 'Z → A' };
  };

  const labels = getSortLabels();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-0 gap-1 font-semibold hover:bg-transparent text-primary-foreground hover:text-primary-foreground/80 flex items-center",
            (isActive || hasFilter) && "text-primary-foreground underline underline-offset-2",
            className
          )}
        >
          <span>{children}</span>
          {getSortIcon()}
          {hasFilter && <Filter className="h-3 w-3 ml-0.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-2">
          {/* Sort options */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 pt-1">
            Urutkan
          </div>
          <div className="space-y-1">
            <Button
              variant={direction === 'asc' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start gap-2 h-8"
              onClick={() => handleSort('asc')}
            >
              <ArrowUp className="h-3 w-3" />
              {labels.asc}
            </Button>
            <Button
              variant={direction === 'desc' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start gap-2 h-8"
              onClick={() => handleSort('desc')}
            >
              <ArrowDown className="h-3 w-3" />
              {labels.desc}
            </Button>
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-muted-foreground"
                onClick={() => handleSort(null)}
              >
                <X className="h-3 w-3" />
                Hapus Urutan
              </Button>
            )}
          </div>

          {/* Category filter */}
          {filterOptions && filterOptions.length > 0 && onFilterChange && (
            <>
              <div className="border-t my-2" />
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                Filter
              </div>
              <Select value={filterValue || 'all'} onValueChange={onFilterChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={filterPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {filterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Utility function to sort data
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig | null,
  getValue: (item: T, key: string) => string | number | null | undefined
): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data;
  }

  return [...data].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

    // Compare based on type
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    }

    // String comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortConfig.direction === 'asc') {
      return aStr.localeCompare(bStr, 'id');
    }
    return bStr.localeCompare(aStr, 'id');
  });
}
