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

  // 💡 伺服器端直出：撈取全體點數交易明細，並安全進行記憶體高效配對，避免 Supabase 跨表錯誤
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

  return (
    <AdminDashboardClient 
      adminName={profile.name} 
      initialRewards={rewards || []} 
      transactions={formattedTransactions}
    />
  );
}
