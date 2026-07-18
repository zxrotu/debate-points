import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
// 💡 補上遺漏的 Client 元件匯入
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

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('member_id', payload.id)
    .order('created_at', { ascending: false });

  // 💡 讀取該學員目前正在審核中（pending）的所有獎品 ID 清單
  let pendingRewardIds: number[] = [];
  try {
    const { data: pendingRequests } = await supabase
      .from('redemptions')
      .select('reward_id')
      .eq('member_id', payload.id)
      .eq('status', 'pending');

    if (pendingRequests) {
      pendingRewardIds = pendingRequests.map((r: any) => r.reward_id);
    }
  } catch (err) {
    console.error(err);
  }

  // 防禦性公告查詢
  let announcement = '';
  try {
    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select('content')
      .eq('id', 1)
      .maybeSingle();

    if (!annError && annData) {
      announcement = annData.content || '';
    }
  } catch (err) {
    console.error(err);
  }

  return (
    <MemberDashboardClient 
      profile={profile} 
      rewards={rewards || []} 
      transactions={transactions || []}
      announcement={announcement}
      pendingRewardIds={pendingRewardIds} // 💡 傳入審核中清單
    />
  );
}
