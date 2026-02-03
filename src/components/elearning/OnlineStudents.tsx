import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Circle, ChevronDown, ChevronUp, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlineUser {
  id: string;
  full_name: string;
  nim: string | null;
  photo_url: string | null;
  online_at: string;
}

interface OnlineStudentsProps {
  classId: string;
  classGroupId: string;
}

export function OnlineStudents({ classId, classGroupId }: OnlineStudentsProps) {
  const { profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [allStudents, setAllStudents] = useState<{id: string; full_name: string; nim: string | null; photo_url: string | null}[]>([]);

  const canView = profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'dosen';

  // Fetch all students in the class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!classGroupId) return;

      const { data, error } = await supabase
        .from('class_students')
        .select(`
          student_profile_id,
          student:profiles!class_students_student_profile_id_fkey (
            id, full_name, nim, photo_url
          )
        `)
        .eq('class_group_id', classGroupId);

      if (!error && data) {
        const students = data.map((cs: any) => ({
          id: cs.student.id,
          full_name: cs.student.full_name,
          nim: cs.student.nim,
          photo_url: cs.student.photo_url
        }));
        setAllStudents(students);
      }
    };

    fetchStudents();
  }, [classGroupId]);

  // Setup Realtime Presence
  useEffect(() => {
    if (!profile?.id || !classId) return;

    const channelName = `class-presence:${classId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.role === 'mahasiswa') {
              users.push({
                id: presence.user_id,
                full_name: presence.full_name,
                nim: presence.nim,
                photo_url: presence.photo_url,
                online_at: presence.online_at,
              });
            }
          });
        });

        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await channel.track({
            user_id: profile.id,
            full_name: profile.full_name,
            nim: profile.nim,
            photo_url: profile.photo_url,
            role: profile.role,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, profile?.full_name, profile?.nim, profile?.photo_url, profile?.role, classId]);

  if (!canView) return null;

  const onlineCount = onlineUsers.length;
  const totalStudents = allStudents.length;
  
  // Get online student IDs for quick lookup
  const onlineIds = new Set(onlineUsers.map(u => u.id));
  
  // Sort: online students first, then offline
  const sortedStudents = [...allStudents].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Mahasiswa Online</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {onlineCount} dari {totalStudents} mahasiswa aktif
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Circle className="h-2 w-2 fill-current mr-1" />
                  {onlineCount} Online
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {totalStudents === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada mahasiswa di kelas ini
              </p>
            ) : (
              <div className="max-h-[300px] overflow-auto space-y-1">
                {sortedStudents.map((student) => {
                  const isOnline = onlineIds.has(student.id);
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-colors",
                        isOnline ? "bg-green-50 dark:bg-green-900/10" : "bg-muted/30"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {student.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                            isOnline ? "bg-green-500" : "bg-gray-400"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isOnline ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {student.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{student.nim || '-'}</p>
                      </div>
                      {isOnline && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                          Online
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
