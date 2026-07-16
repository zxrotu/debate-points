import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import MemberDashboardClient from './MemberDashboardClient';

export default async function MemberDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login?role=member');
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'member') {
    redirect('/login?role=member');
  }

  const { data: profile, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', payload.id)
    .single();

  if (error || !profile) {
    redirect('/login?role=member');
  }

  const { data: rewards } = await supabase.from('rewards').select('*');

  return (
    <MemberDashboardClient 
      profile={profile} 
      rewards={rewards || []} 
    />
  );
}
