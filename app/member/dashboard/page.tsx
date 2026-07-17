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

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('member_id', payload.id)
    .order('created_at', { ascending: false });

  // 💡 防禦性容錯查詢：即使資料庫沒建 announcements 表也絕對不崩潰
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
    />
  );
}
