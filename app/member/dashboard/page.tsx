import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import MemberDashboardClient from './MemberDashboardClient';

export default async function MemberDashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login?role=member');
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'member') {
    redirect('/login?role=member');
  }

  // 根據登入時 JWT 的 ID 安全撈取當前登入學生的即時點數
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

  return <MemberDashboardClient profile={profile} rewards={rewards || []} />;
}
