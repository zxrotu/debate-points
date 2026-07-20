import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login?role=admin');
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    redirect('/login?role=admin');
  }

  // 獲取管理員姓名
  const { data: profile, error } = await supabase
    .from('members')
    .select('name')
    .eq('id', payload.id)
    .single();

  if (error || !profile) {
    redirect('/login?role=admin');
  }

  const { data: rewards } = await supabase
    .from('rewards')
    .select('*')
    .order('points_required', { ascending: true });

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  // 處理交易紀錄格式
  let formattedTransactions: any[] = [];
  if (transactions && transactions.length > 0) {
    const memberIds = Array.from(new Set(transactions.map((t: any) => t.member_id)));
    const { data: members } = await supabase
      .from('members')
      .select('id, name, username')
      .in('id', memberIds);

    const memberMap = new Map(members?.map((m: any) => [m.id, m]) || []);
    
    formattedTransactions = transactions.map((t: any) => {
      const m = memberMap.get(t.member_id) || { name: '未知學員', username: 'unknown' };
      return {
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        created_at: t.created_at,
        student_name: m.name,
        student_username: m.username
      };
    });
  }

  // 獲取公告
  let announcement = '';
  try {
    const { data: annData } = await supabase
      .from('announcements')
      .select('content')
      .eq('id', 1)
      .maybeSingle();
    announcement = annData?.content || '';
  } catch (err) {
    console.error(err);
  }

  // 獲取線上兌換申請
  let initialRedeemRequests: any[] = [];
  try {
    const { data } = await supabase
      .from('redemptions')
      .select(`
        id, status, created_at,
        members ( id, name, username, points ),
        rewards ( id, title, points_required )
      `)
      .eq('status', 'pending');

    if (data) {
      initialRedeemRequests = data.map((item: any) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        student_id: item.members.id,
        student_name: item.members.name,
        student_username: item.members.username,
        student_points: item.members.points,
        reward_id: item.rewards.id,
        reward_title: item.rewards.title,
        points_required: item.rewards.points_required
      }));
    }
  } catch (err) {
    console.error(err);
  }

  return (
    <AdminDashboardClient 
      adminName={profile.name} 
      initialRewards={rewards || []} 
      transactions={formattedTransactions}
      announcement={announcement}
      initialRedeemRequests={initialRedeemRequests}
    />
  );
}
