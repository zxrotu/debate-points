import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { student_id, qr_token, username, amount, reason } = await request.json();

    let query = supabase.from('members').select('*');
    
    if (student_id) {
      query = query.eq('id', student_id);
    } else if (qr_token) {
      query = query.eq('qr_token', qr_token);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return NextResponse.json({ error: '請提供學生的 ID、帳號或條碼金鑰' }, { status: 400 });
    }

    const { data: member, error: fetchError } = await query.single();
    if (fetchError || !member) {
      return NextResponse.json({ error: '找不到該社員，無法更新點數' }, { status: 404 });
    }

    const newPoints = member.points + amount;
    if (newPoints < 0) {
      return NextResponse.json({ error: `扣點失敗！該員僅剩 ${member.points} 個論點` }, { status: 400 });
    }

    // 更新點數與記錄交易
    const { error: updateError } = await supabase
      .from('members')
      .update({ points: newPoints })
      .eq('id', member.id);

    if (updateError) throw updateError;

    await supabase.from('transactions').insert({
      member_id: member.id,
      amount,
      reason,
    });

    return NextResponse.json({ success: true, memberName: member.name, newPoints });
  } catch (err) {
    return NextResponse.json({ error: '交易更新失敗' }, { status: 500 });
  }
}
