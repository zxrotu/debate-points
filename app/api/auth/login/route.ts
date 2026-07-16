import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password, isAdminLogin } = await request.json();

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    // 檢查登入管道是否正確
    if (isAdminLogin && member.role !== 'admin') {
      return NextResponse.json({ error: '您非管理員，請使用社員登入' }, { status: 403 });
    }
    if (!isAdminLogin && member.role === 'admin') {
      return NextResponse.json({ error: '管理員請前往專屬登入頁面' }, { status: 403 });
    }

    const token = await signToken({
      id: member.id,
      username: member.username,
      name: member.name,
      role: member.role,
    });

    const response = NextResponse.json({ success: true, role: member.role });
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1天
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
