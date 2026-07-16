import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, username, points')
      .eq('role', 'member')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, students: data });
  } catch (err) {
    return NextResponse.json({ error: '獲取學員名單失敗' }, { status: 500 });
  }
}
