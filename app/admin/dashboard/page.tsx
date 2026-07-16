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
          supportedScanTypes: [0], // 僅限相機
          videoConstraints: {
            facingMode: "environment" // 強制後置鏡頭
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
          // 忽略掃描異常
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
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ maxWidth: '500px' }}>
        <header style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>管理員主控台</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>管理社員「論點」增減</p>
          </div>
          <button onClick={handleLogout} className="custom-btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}>
            登出
          </button>
        </header>

        <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
          <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>設定點數變更參數</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>
              <label className="custom-field-label">變更點數 (正數加，負數扣)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="custom-input" />
            </div>
            <div>
              <label className="custom-field-label">變更事由</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="custom-input" />
            </div>
          </div>
        </div>

        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '9999px', border: '2px solid #CBD5E1', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('scan')} className="custom-btn-primary" style={{ flex: 1, backgroundColor: activeTab === 'scan' ? '#0097B2' : 'transparent', color: activeTab === 'scan' ? '#FFFFFF' : '#64748B', boxShadow: 'none' }}>
            掃描 QR Code
          </button>
          <button onClick={() => setActiveTab('manual')} className="custom-btn-primary" style={{ flex: 1, backgroundColor: activeTab === 'manual' ? '#0097B2' : 'transparent', color: activeTab === 'manual' ? '#FFFFFF' : '#64748B', boxShadow: 'none' }}>
            手動輸入學號
          </button>
        </div>

        {activeTab === 'scan' ? (
          <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，將社員 QR Code 放置於鏡頭前</p>
            <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
          </div>
        ) : (
          <div className="custom-card" style={{ maxWidth: '100%' }}>
            <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>手動指定社員點數</h3>
            <div>
              <label className="custom-field-label">社員登入帳號 (學號)</label>
              <input type="text" placeholder="例如 student01" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="custom-input" />
              <button onClick={() => handlePointsAction({ username: manualUsername })} disabled={loading || !manualUsername} className="custom-btn-primary" style={{ width: '100%' }}>
                {loading ? '處理中...' : '提交點數異動'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
