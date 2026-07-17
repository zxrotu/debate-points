import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    if (content === undefined || content.trim() === '') {
      return NextResponse.json({ error: '請輸入公告內容' }, { status: 400 });
    }

    // 使用 upsert 安全更新 id = 1 的公告 (若不存在則建立)
    const { error } = await supabase
      .from('announcements')
      .upsert({
        id: 1,
        content: content.trim(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: '公告更新成功' });
  } catch (err) {
    return NextResponse.json({ error: '更新公告失敗' }, { status: 500 });
  }
}
