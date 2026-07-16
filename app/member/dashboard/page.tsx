'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

export default function MemberDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    const fetchMemberData = async () => {
      // 這裡預設抓取 student01 作為展示，實際部署後可根據登入身分抓取
      const { data } = await supabase.from('members').select('*').eq('username', 'student01').single(); 
      setProfile(data);

      const { data: rewardData } = await supabase.from('rewards').select('*');
      setRewards(rewardData || []);
    };
    fetchMemberData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!profile) return <div className="text-center text-white p-20">載入中...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">你好，{profile.name} 👋</h1>
            <p className="text-slate-400 text-sm">歡迎回到辯論社論點系統</p>
          </div>
          <button onClick={handleLogout} className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition">登出</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col justify-center items-center">
            <p className="text-slate-400 text-sm mb-1">我的「論點」餘額</p>
            <p className="text-5xl font-black text-amber-400">{profile.points} <span className="text-lg font-normal">點</span></p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center md:col-span-2">
            <h3 className="text-lg font-semibold mb-3">兌換請出示 QR Code</h3>
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={profile.qr_token} size={140} />
            </div>
            <p className="text-xs text-slate-500 mt-2">請勿截圖或轉傳他人，點數不得轉贈</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-200">可兌換獎品</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map(reward => (
              <div key={reward.id} className="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-100">{reward.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{reward.description}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${profile.points >= reward.points_required ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {reward.points_required} 論點
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
