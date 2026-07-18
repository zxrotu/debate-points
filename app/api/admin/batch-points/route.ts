import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. 撈取目前所有待審核的申請
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('redemptions')
      .select('*')
      .eq('status', 'pending');

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, requests: [] });
    }

    // 批次高效對接
    const memberIds = Array.from(new Set(data.map((r: any) => r.member_id)));
    const rewardIds = Array.from(new Set(data.map((r: any) => r.reward_id)));

    const { data: members } = await supabase.from('members').select('id, name, username, points').in('id', memberIds);
    const { data: rewards } = await supabase.from('rewards').select('id, title, points_required').in('id', rewardIds);

    const memberMap = new Map(members?.map((m: any) => [m.id, m]) || []);
    const rewardMap = new Map(rewards?.map((r: any) => [r.id, r]) || []);

    const formatted = data.map((item: any) => {
      const student = memberMap.get(item.member_id) || { name: '未知社員', username: '', points: 0 };
      const reward = rewardMap.get(item.reward_id) || { title: '未知獎品', points_required: 0 };

      return {
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        student_name: student.name,
        student_username: student.username,
        student_points: student.points,
        reward_title: reward.title,
        points_required: reward.points_required
      };
    });

    return NextResponse.json({ success: true, requests: formatted });
  } catch (err) {
    return NextResponse.json({ error: '獲取數據失敗' }, { status: 500 });
  }
}

// 2. 審核：同意兌換（扣點並記錄）或 拒絕兌換
export async function POST(request: Request) {
  try {
    const { request_id, action } = await request.json();

    const { data: redeemReq, error: reqError } = await supabase
      .from('redemptions')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqError || !redeemReq) {
      return NextResponse.json({ error: '找不到該兌換要求' }, { status: 404 });
    }

    if (redeemReq.status !== 'pending') {
      return NextResponse.json({ error: '該要求已被處理過' }, { status: 400 });
    }

    // 撈取學生與獎品資訊
    const { data: member } = await supabase.from('members').select('points, name').eq('id', redeemReq.member_id).single();
    const { data: reward } = await supabase.from('rewards').select('title, points_required').eq('id', redeemReq.reward_id).single();

    if (!member || !reward) {
      return NextResponse.json({ error: '學員或獎品資料已損毀' }, { status: 404 });
    }

    if (action === 'approve') {
      if (member.points < reward.points_required) {
        return NextResponse.json({ error: '此社員目前點數不足以兌換此獎品' }, { status: 400 });
      }

      // 扣除點數
      const newPoints = member.points - reward.points_required;
      const { error: updateError } = await supabase
        .from('members')
        .update({ points: newPoints })
        .eq('id', redeemReq.member_id);

      if (updateError) throw updateError;

      // 寫入點數異動歷史
      await supabase.from('transactions').insert({
        member_id: redeemReq.member_id,
        amount: -reward.points_required,
        reason: `兌換獎品：${reward.title}`
      });

      // 更新要求狀態
      await supabase.from('redemptions').update({ status: 'approved' }).eq('id', request_id);

      return NextResponse.json({ success: true, message: `已成功核准兌換！扣除 ${member.name} ${reward.points_required} 點` });
    } else if (action === 'reject') {
      // 拒絕兌換，僅更新狀態，不扣點
      await supabase.from('redemptions').update({ status: 'rejected' }).eq('id', request_id);
      return NextResponse.json({ success: true, message: '已成功拒絕此兌換申請' });
    }

    return NextResponse.json({ error: '無效的操作' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
