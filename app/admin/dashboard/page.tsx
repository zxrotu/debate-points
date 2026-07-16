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
          // 關鍵設定：強制只使用手機鏡頭掃描，禁用圖片上傳與拍照檔案選擇
          supportedScanTypes: [0] 
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          await handlePointsAction({ qr_token: decodedText });
        },
        (error) => {
          // 忽略掃描過程的微小偵測異常
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
    <div className="min-h-screen bg-[#FAF3E8] text-black p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-300">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">管理員主控台</h1>
            <p className="text-slate-500 text-sm">管理社員「論點」增減</p>
          </div>
          <button onClick={handleLogout} className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg transition">登出</button>
        </header>

        <div className="p-6 bg-white rounded-2xl mb-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">設定點數變更參數</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">變更點數 (正數加點，負數扣點)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-[#FAF3E8] border border-slate-300 rounded-lg px-4 py-2 text-black focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">變更事由</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-300 rounded-lg px-4 py-2 text-black focus:outline-none" />
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 text-center font-semibold border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-rose-50 border-rose-500 text-rose-600'}`}>
            {message.text}
          </div>
        )}

        <div className="flex border-b border-slate-200 mb-6">
          <button onClick={() => setActiveTab('scan')} className={`flex-1 py-3 text-center font-bold border-b-2 transition ${activeTab === 'scan' ? 'border-[#0097B2] text-[#0097B2]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            掃描 QR Code 異動
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-3 text-center font-bold border-b-2 transition ${activeTab === 'manual' ? 'border-[#0097B2] text-[#0097B2]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            手動輸入學號/帳號
          </button>
        </div>

        {activeTab === 'scan' ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-4 text-center">請允許相機權限，並將社員出示的 QR Code 放置於鏡頭前</p>
            <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden bg-[#FAF3E8] border border-slate-300"></div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">手動指定社員點數</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">社員登入帳號 (學號)</label>
                <input type="text" placeholder="例如 student01" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-300 rounded-lg px-4 py-2 text-black focus:outline-none" />
              </div>
              <button onClick={() => handlePointsAction({ username: manualUsername })} disabled={loading || !manualUsername} className="w-full bg-[#0097B2] hover:bg-[#007A8F] text-white py-3 rounded-lg font-bold transition shadow-sm">
                {loading ? '處理中...' : '提交點數異動'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
