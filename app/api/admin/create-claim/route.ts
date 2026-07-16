import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { title, points, duration_minutes } = await request.json();

    if (!title || !points || !duration_minutes) {
      return NextResponse.json({ error: '請完整填寫活動名稱、點數與時間' }, { status: 400 });
    }

    // 計算過期時間：當前時間 + N 分鐘
    const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('claims')
      .insert({
        title,
        points: Number(points),
        expires_at: expiresAt
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, claim: data[0] });
  } catch (err) {
    return NextResponse.json({ error: '創建集體加點失敗' }, { status: 500 });
  }
}
