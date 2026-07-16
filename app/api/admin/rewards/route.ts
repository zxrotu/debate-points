import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { title, points_required, description } = await request.json();

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
    return NextResponse.json({ error: '新增禮品失敗' }, { status: 500 });
  }
}
