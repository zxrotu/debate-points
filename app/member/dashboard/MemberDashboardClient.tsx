'use client';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
}

export default function MemberDashboardClient({ profile, rewards }: MemberDashboardClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FAF3E8] text-black p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-300">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">你好，{profile.name}</h1>
            <p className="text-slate-500 text-sm">歡迎回到辯論社論點系統</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg transition"
          >
            登出
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 餘額顯示 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
            <p className="text-slate-500 text-sm mb-1">我的「論點」餘額</p>
            <p className="text-5xl font-black text-[#0097B2]">{profile.points} <span className="text-lg font-normal text-slate-800">點</span></p>
          </div>

          {/* QR Code 顯示 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center md:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">兌換請出示 QR Code</h3>
            <div className="bg-white p-3 border border-slate-200 rounded-xl">
              <QRCodeSVG value={profile.qr_token} size={140} />
            </div>
            <p className="text-xs text-slate-400 mt-2">請勿截圖或轉傳他人，點數不得轉贈</p>
          </div>
        </div>

        {/* 兌換獎品清單 */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800">可兌換獎品</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map(reward => (
              <div key={reward.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-800">{reward.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{reward.description}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${profile.points >= reward.points_required ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
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
