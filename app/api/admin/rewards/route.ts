import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 💡 1. 支援刪除禮品功能
    if (body.action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: '無效的禮品ID' }, { status: 400 });
      }
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: '已成功刪除該禮品' });
    }

    // 2. 原有的新增禮品功能
    const { title, points_required, description } = body;
    if (!title || !points_required) {
      return NextResponse.json({ error: '請提供禮品名稱與所需點數' }, { status: 400 });
    }

    const { data, error } = await supabase.from('rewards').insert({
      title,
      points_required: Number(points_required),
      description: description || ''
    }).select();

    if (error) throw error;
    return NextResponse.json({ success: true, reward: data[0] });
  } catch (err) {
    return NextResponse.json({ error: '操作失敗' }, { status: 500 });
  }
}
