import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'member') {
      return NextResponse.json({ error: '權限不足' }, { status: 401 });
    }

    const { reward_id } = await request.json();

    // 1. 檢查獎品是否存在
    const { data: reward } = await supabase.from('rewards').select('*').eq('id', reward_id).single();
    if (!reward) {
      return NextResponse.json({ error: '找不到該獎品' }, { status: 404 });
    }

    // 2. 檢查是否已經有正在審核中的相同申請，防範重複點擊
    const { data: existing } = await supabase
      .from('redemptions')
      .select('*')
      .eq('member_id', payload.id)
      .eq('reward_id', reward_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '已申請過此獎品，請耐心等待審核' }, { status: 400 });
    }

    // 3. 檢查點數
    const { data: member } = await supabase.from('members').select('points').eq('id', payload.id).single();
    if (!member) {
      return NextResponse.json({ error: '找不到社員資料' }, { status: 404 });
    }

    if (member.points < reward.points_required) {
      return NextResponse.json({ error: '您的點數不足' }, { status: 400 });
    }

    // 4. 寫入兌換申請表 (狀態為 pending)
    const { error: insertError } = await supabase.from('redemptions').insert({
      member_id: payload.id,
      reward_id: reward_id,
      status: 'pending'
    });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '系統錯誤，申請失敗' }, { status: 500 });
  }
}
