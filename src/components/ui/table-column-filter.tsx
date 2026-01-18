import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableColumnFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableColumnFilter({ 
  value, 
  onChange, 
  placeholder = "Filter...",
  className 
}: TableColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const hasValue = value.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 ml-1",
            hasValue && "text-primary bg-primary/10",
            className
          )}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex gap-1">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          {hasValue && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => onChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TableFilterHeaderProps {
  children: React.ReactNode;
  filterValue: string;
  onFilterChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableFilterHeader({
  children,
  filterValue,
  onFilterChange,
  placeholder,
  className
}: TableFilterHeaderProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <span>{children}</span>
      <TableColumnFilter
        value={filterValue}
        onChange={onFilterChange}
        placeholder={placeholder}
      />
    </div>
  );
}
