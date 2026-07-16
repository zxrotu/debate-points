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
    <div className="min-h-screen bg-[#FAF3E8] text-black p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-800">你好，{profile.name}</h1>
            <p className="text-slate-400 text-xs mt-0.5">歡迎回到辯論社論點系統</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-full transition font-semibold"
          >
            登出
          </button>
        </header>

        <div className="grid grid-cols-1 gap-5 mb-8">
          {/* 餘額卡片 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
            <p className="text-slate-400 text-xs mb-1">我的「論點」餘額</p>
            <p className="text-5xl font-black text-[#0097B2]">{profile.points} <span className="text-base font-normal text-slate-500">點</span></p>
          </div>

          {/* QR Code 卡片 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold text-slate-700 mb-3">出示此 QR Code 進行兌換</h3>
            <div className="bg-white p-3 border border-slate-100 rounded-2xl shadow-sm">
              <QRCodeSVG value={profile.qr_token} size={150} />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-light">截圖無效，點數不可轉贈他人</p>
          </div>
        </div>

        {/* 兌換獎品清單 */}
        <div className="mb-6">
          <h2 className="text-base font-bold mb-3 text-slate-800 px-1">可兌換獎品</h2>
          <div className="space-y-3">
            {rewards.map(reward => (
              <div key={reward.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{reward.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-light">{reward.description}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${profile.points >= reward.points_required ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {reward.points_required} 點
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
