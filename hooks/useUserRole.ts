'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  role: 'admin' | 'salesperson';
  email?: string;
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, role, email')
          .eq('id', session.user.id)
          .single();

        setProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isSalesperson: profile?.role === 'salesperson',
  };
}
