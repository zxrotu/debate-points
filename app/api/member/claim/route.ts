import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    // 1. 驗證是否登入
    if (!token) {
      return NextResponse.json({ error: 'NOT_LOGGED_IN' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'member') {
      return NextResponse.json({ error: 'NOT_LOGGED_IN' }, { status: 401 });
    }

    const { claim_id } = await request.json();
    if (!claim_id) {
      return NextResponse.json({ error: '活動代碼無效' }, { status: 400 });
    }

    // 2. 查詢該活動憑證
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim_id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: '找不到該加點活動' }, { status: 404 });
    }

    // 3. 檢查是否已經過期
    const expiresTime = new Date(claim.expires_at).getTime();
    if (Date.now() > expiresTime) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 410 });
    }

    // 4. 檢查該學生是否已經重複領取過
    const { data: log, error: logError } = await supabase
      .from('claim_logs')
      .select('*')
      .eq('claim_id', claim_id)
      .eq('member_id', payload.id)
      .maybeSingle();

    if (log) {
      return NextResponse.json({ error: 'ALREADY_CLAIMED', title: claim.title, points: claim.points }, { status: 400 });
    }

    // 5. 順利通過驗證，開始寫入領取紀錄
    const { error: insertLogError } = await supabase
      .from('claim_logs')
      .insert({
        claim_id: claim_id,
        member_id: payload.id
      });

    if (insertLogError) throw insertLogError;

    // 6. 為學生加上點數
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name, points')
      .eq('id', payload.id)
      .single();

    if (memberError || !member) throw memberError;

    const newPoints = member.points + claim.points;
    const { error: updateError } = await supabase
      .from('members')
      .update({ points: newPoints })
      .eq('id', payload.id);

    if (updateError) throw updateError;

    // 7. 寫入交易明細
    await supabase.from('transactions').insert({
      member_id: payload.id,
      amount: claim.points,
      reason: `掃碼領取：${claim.title}`
    });

    return NextResponse.json({ 
      success: true, 
      student_name: member.name, 
      title: claim.title, 
      points_added: claim.points, 
      new_points: newPoints 
    });

  } catch (err: any) {
    return NextResponse.json({ error: '系統錯誤，領取失敗' }, { status: 500 });
  }
}
