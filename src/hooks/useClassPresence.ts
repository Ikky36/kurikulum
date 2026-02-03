import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  id: string;
  full_name: string;
  nim: string | null;
  photo_url: string | null;
  role: string;
  online_at: string;
}

export function useClassPresence(classId: string | undefined) {
  const { profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

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
            users.push({
              id: presence.user_id,
              full_name: presence.full_name,
              nim: presence.nim,
              photo_url: presence.photo_url,
              role: presence.role,
              online_at: presence.online_at,
            });
          });
        });

        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track current user's presence - ALL users track their presence
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
      setIsConnected(false);
    };
  }, [profile?.id, profile?.full_name, profile?.nim, profile?.photo_url, profile?.role, classId]);

  // Filter only mahasiswa from online users
  const onlineStudents = onlineUsers.filter(u => u.role === 'mahasiswa');

  return {
    onlineUsers,
    onlineStudents,
    isConnected,
  };
}
