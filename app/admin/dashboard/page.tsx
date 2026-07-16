'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [amount, setAmount] = useState<number>(5);
  const [reason, setReason] = useState('參與社課加點');
  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'scan') {
      const scanner = new Html5QrcodeScanner(
        'reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0], // 僅限相機掃描
          videoConstraints: {
            facingMode: "environment" // 👈 強制調用後置（背面環境）相機！
          }
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          await handlePointsAction({ qr_token: decodedText });
        },
        (error) => {
          // 忽略掃描中的微小異常
        }
      );

      return () => {
        scanner.clear().catch(err => console.error("Scanner clear error", err));
      };
    }
  }, [activeTab, amount, reason]);

  const handlePointsAction = async (payload: { qr_token?: string; username?: string }) => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    const res = await fetch('/api/admin/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        amount,
        reason,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({
        text: `操作成功！社員: ${data.memberName}，點數已變更。新餘額為: ${data.newPoints} 論點`,
        type: 'success',
      });
      setManualUsername('');
    } else {
      setMessage({ text: data.error || '操作失敗', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FAF3E8] text-black p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-300">
          <div>
            <h1 className="text-xl font-bold text-slate-800">管理員主控台</h1>
            <p className="text-slate-400 text-xs mt-0.5">管理社員「論點」增減</p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-full transition font-semibold">登出</button>
        </header>

        <div className="p-5 bg-white rounded-3xl mb-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 px-1">設定點數變更參數</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 px-1">變更點數 (正數加點，負數扣點)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-[#FAF3E8] border border-slate-200 rounded-full px-4 py-2 text-black text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 px-1">變更事由</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-200 rounded-full px-4 py-2 text-black text-sm focus:outline-none" />
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl mb-6 text-center text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-rose-50 border-rose-400 text-rose-500'}`}>
            {message.text}
          </div>
        )}

        <div className="flex border-b border-slate-200 mb-6 bg-white p-1 rounded-full shadow-sm">
          <button onClick={() => setActiveTab('scan')} className={`flex-1 py-2 text-center text-sm font-bold rounded-full transition ${activeTab === 'scan' ? 'bg-[#0097B2] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            掃描 QR Code
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2 text-center text-sm font-bold rounded-full transition ${activeTab === 'manual' ? 'bg-[#0097B2] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            手動輸入學號
          </button>
        </div>

        {activeTab === 'scan' ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <p className="text-xs text-slate-400 mb-4 text-center">請允許相機權限，將社員 QR Code 放置於鏡頭前</p>
            <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden bg-[#FAF3E8] border border-slate-200"></div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">手動指定社員點數</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 px-1">社員登入帳號 (學號)</label>
                <input type="text" placeholder="例如 student01" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-200 rounded-full px-4 py-2 text-black text-sm focus:outline-none" />
              </div>
              <button onClick={() => handlePointsAction({ username: manualUsername })} disabled={loading || !manualUsername} className="w-full bg-[#0097B2] hover:bg-[#007A8F] text-white py-3 rounded-full font-bold transition shadow-sm text-sm">
                {loading ? '處理中...' : '提交點數異動'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
