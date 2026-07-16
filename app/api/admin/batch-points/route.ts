import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { student_ids, amount, reason } = await request.json();

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: '請至少選擇一位社員' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '請輸入有效的加點分數' }, { status: 400 });
    }

    // 1. 批次查詢選定學員的目前點數
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('id, points')
      .in('id', student_ids);

    if (fetchError || !members) throw fetchError;

    // 2. 併行更新點數並記錄交易
    const updatePromises = members.map(async (m) => {
      const newPoints = m.points + amount;
      
      // 更新成員點數
      const { error: uErr } = await supabase
        .from('members')
        .update({ points: newPoints })
        .eq('id', m.id);
      if (uErr) throw uErr;

      // 寫入交易紀錄
      const { error: tErr } = await supabase.from('transactions').insert({
        member_id: m.id,
        amount,
        reason,
      });
      if (tErr) throw tErr;
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, count: student_ids.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '批次加點失敗' }, { status: 500 });
  }
}
