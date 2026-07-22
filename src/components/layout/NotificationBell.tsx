import { useState } from 'react';
import { Bell, BookOpen, FileText, ClipboardCheck, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, NotificationItem } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  switch (type) {
    case 'unread_material':
      return <BookOpen className="h-4 w-4 text-blue-500" />;
    case 'pending_assignment':
      return <FileText className="h-4 w-4 text-amber-500" />;
    case 'ungraded_submission':
      return <ClipboardCheck className="h-4 w-4 text-emerald-500" />;
    case 'pending_krs':
      return <FileText className="h-4 w-4 text-blue-500" />;
  }
}

function NotificationCard({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const isOverdue = item.dueDate && isPast(parseISO(item.dueDate));

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 hover:bg-accent/50 rounded-lg transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-muted">
          <NotificationIcon type={item.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground truncate">{item.classTitle}</span>
            {item.dueDate && (
              <span className={cn(
                "text-xs flex items-center gap-1 shrink-0",
                isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                {isOverdue ? 'Terlambat' : format(parseISO(item.dueDate), 'd MMM', { locale: idLocale })}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
      </div>
    </button>
  );
}

export function NotificationBell() {
  const { data: notifications = [], isLoading } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const totalCount = notifications.length;

  const unreadMaterials = notifications.filter(n => n.type === 'unread_material');
  const pendingAssignments = notifications.filter(n => n.type === 'pending_assignment');
  const ungradedSubmissions = notifications.filter(n => n.type === 'ungraded_submission');

  const handleNotificationClick = (item: NotificationItem) => {
    setOpen(false);
    navigate('/e-learning');
  };

  const sections = [
    { title: 'Materi Belum Dibaca', items: unreadMaterials, icon: BookOpen, color: 'text-blue-500' },
    { title: 'Tugas/Quiz Belum Dikerjakan', items: pendingAssignments, icon: FileText, color: 'text-amber-500' },
    { title: 'Belum Diperiksa', items: ungradedSubmissions, icon: ClipboardCheck, color: 'text-emerald-500' },
  ].filter(s => s.items.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifikasi</h3>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalCount} item
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Tidak ada notifikasi</p>
            <p className="text-xs mt-1">Semua sudah dikerjakan! 🎉</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {sections.map((section) => (
                <div key={section.title} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <section.icon className={cn("h-3.5 w-3.5", section.color)} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {section.title} ({section.items.length})
                    </span>
                  </div>
                  {section.items.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onClick={() => handleNotificationClick(item)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {totalCount > 0 && (
          <div className="border-t px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                navigate('/e-learning');
              }}
            >
              Buka E-Learning
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
