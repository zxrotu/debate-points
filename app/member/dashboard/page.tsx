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

  // 撈取學生最新個人資訊
  const { data: profile, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', payload.id)
    .single();

  if (error || !profile) {
    redirect('/login?role=member');
  }

  // 取得獎品清單
  const { data: rewards } = await supabase.from('rewards').select('*');

  // 取得學生自己正在審核中（pending）的兌換申請
  const { data: activeRequests } = await supabase
    .from('redemptions')
    .select('reward_id')
    .eq('member_id', payload.id)
    .eq('status', 'pending');

  const pendingRewardIds = activeRequests ? activeRequests.map((r: any) => r.reward_id) : [];

  return (
    <MemberDashboardClient 
      profile={profile} 
      rewards={rewards || []} 
      pendingRewardIds={pendingRewardIds} 
    />
  );
}
