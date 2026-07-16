import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 管理員拉取目前待審核的申請
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('redemptions')
      .select(`
        id,
        status,
        created_at,
        members ( id, name, username, points ),
        rewards ( id, title, points_required )
      `)
      .eq('status', 'pending');

    if (error) throw error;

    const formatted = data.map((item: any) => ({
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      student_id: item.members.id,
      student_name: item.members.name,
      student_username: item.members.username,
      student_points: item.members.points,
      reward_id: item.rewards.id,
      reward_title: item.rewards.title,
      points_required: item.rewards.points_required
    }));

    return NextResponse.json({ success: true, requests: formatted });
  } catch (err) {
    return NextResponse.json({ error: '獲取數據失敗' }, { status: 500 });
  }
}

// 管理員核准或拒絕
export async function POST(request: Request) {
  try {
    const { request_id, action } = await request.json();

    const { data: redeemReq, error: reqError } = await supabase
      .from('redemptions')
      .select(`
        id,
        member_id,
        reward_id,
        status,
        members ( points, name ),
        rewards ( title, points_required )
      `)
      .eq('id', request_id)
      .single();

    if (reqError || !redeemReq) {
      return NextResponse.json({ error: '找不到該兌換要求' }, { status: 404 });
    }

    if (redeemReq.status !== 'pending') {
      return NextResponse.json({ error: '該要求已被處理過' }, { status: 400 });
    }

    const member = redeemReq.members as any;
    const reward = redeemReq.rewards as any;

    if (action === 'approve') {
      if (member.points < reward.points_required) {
        return NextResponse.json({ error: '此社員目前點數不足以兌換此獎品' }, { status: 400 });
      }

      // 扣點
      const newPoints = member.points - reward.points_required;
      const { error: updateError } = await supabase
        .from('members')
        .update({ points: newPoints })
        .eq('id', redeemReq.member_id);

      if (updateError) throw updateError;

      // 記錄交易歷史
      await supabase.from('transactions').insert({
        member_id: redeemReq.member_id,
        amount: -reward.points_required,
        reason: `兌換獎品: ${reward.title} (線上申請核准)`
      });

      // 更新要求狀態
      await supabase.from('redemptions').update({ status: 'approved' }).eq('id', request_id);

      return NextResponse.json({ success: true, message: `已成功核准！扣除 ${member.name} ${reward.points_required} 點` });
    } else if (action === 'reject') {
      // 僅拒絕
      await supabase.from('redemptions').update({ status: 'rejected' }).eq('id', request_id);
      return NextResponse.json({ success: true, message: '已拒絕該申請' });
    }

    return NextResponse.json({ error: '無效的操作' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
