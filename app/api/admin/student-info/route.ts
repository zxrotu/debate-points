import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { qr_token, username } = await request.json();

    let query = supabase.from('members').select('id, name, username, points, qr_token');
    
    if (qr_token) {
      query = query.eq('qr_token', qr_token);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return NextResponse.json({ error: '請提供條碼或帳號' }, { status: 400 });
    }

    const { data: member, error } = await query.single();
    if (error || !member) {
      return NextResponse.json({ error: '找不到該社員' }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: member });
  } catch (err) {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
