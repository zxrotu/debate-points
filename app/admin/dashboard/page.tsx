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

  // 💡 防禦性容錯查詢：即使資料庫沒建 announcements 表，也絕對不崩潰網頁！
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
    console.error("Announcements table not ready yet:", err);
  }

  return (
    <AdminDashboardClient 
      adminName={profile.name} 
      initialRewards={rewards || []} 
      transactions={formattedTransactions}
      announcement={announcement}
    />
  );
}
