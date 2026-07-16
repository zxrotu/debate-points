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

  // 從資料庫安全獲取當前登入的管理員姓名
  const { data: profile, error } = await supabase
    .from('members')
    .select('name')
    .eq('id', payload.id)
    .single();

  if (error || !profile) {
    redirect('/login?role=admin');
  }

  return <AdminDashboardClient adminName={profile.name} />;
}
