'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Telescope, Megaphone } from 'lucide-react';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
  transactions: any[];
  announcement: string;
  pendingRewardIds: number[];
}

export default function MemberDashboardClient({ profile, rewards, transactions, announcement, pendingRewardIds }: MemberDashboardClientProps) {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleRedeemRequestSubmit = async (rewardId: number) => {
    setLoadingId(rewardId);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/member/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reward_id: rewardId }) });
      if (res.ok) { setSuccessMsg('申請已送出！'); router.refresh(); }
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner('reader-student', { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0], videoConstraints: { facingMode: "environment" } }, false);
      scanner.render(async (decodedText) => {
        if (scanner) scanner.clear().catch(err => console.error(err));
        setShowScanner(false);
        let claimId = decodedText;
        if (decodedText.includes('?id=')) claimId = decodedText.split('?id=')[1];

        setScanMessage({ text: '驗證中...', type: 'info' });
        try {
          const res = await fetch('/api/member/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim_id: claimId }) });
          const data = await res.json();
          if (res.ok) { setScanMessage({ text: `成功領取 ${data.points_added} 點！`, type: 'success' }); router.refresh(); } 
          else setScanMessage({ text: data.error === 'ALREADY_CLAIMED' ? '已領取過' : '領取失敗', type: 'error' });
        } catch (err) {}
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(console.error); };
  }, [showScanner]);

  const formatDate = (dateStr: string) => dateStr.substring(0, 16).replace('T', ' ');

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold' }}>Hello! {profile.name}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowHistory(!showHistory); setShowScanner(false); }} className="custom-btn-circle"><Telescope size={16} /></button>
            <button onClick={() => { setShowScanner(!showScanner); setShowHistory(false); }} className="custom-btn-logout">{showScanner ? '關閉' : '掃描'}</button>
            <button onClick={handleLogout} className="custom-btn-logout">登出</button>
          </div>
        </header>

        {announcement && !showHistory && (
          <div className="custom-marquee-container"><div className="custom-marquee-icon"><Megaphone size={16} /></div><span className="custom-marquee-text">{announcement}</span></div>
        )}

        {(scanMessage.text || successMsg) && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #10B981', marginBottom: '24px', textAlign: 'center', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: 'bold' }}>{scanMessage.text || successMsg}</div>
        )}

        {showScanner && <div className="custom-card" style={{ marginBottom: '32px' }}><div id="reader-student"></div></div>}

        {showHistory ? (
          <div className="custom-card" style={{ marginBottom: '24px' }}>
            <h3 className="custom-h2" style={{ textAlign: 'center' }}>論點異動查詢</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
              {transactions.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px', borderBottom: '1px solid #E2E8F0' }}>
                  <div><div style={{ fontWeight: 'bold' }}>{t.reason}</div><div style={{ fontSize: '11px', color: '#64748B' }}>{formatDate(t.created_at)}</div></div>
                  <div style={{ fontWeight: 'bold', color: t.amount > 0 ? '#10B981' : '#EF4444' }}>{t.amount > 0 ? `+${t.amount}` : t.amount}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistory(false)} className="custom-btn-primary" style={{ width: '100%' }}>返回首頁</button>
          </div>
        ) : (
          <div>
            <div className="custom-card" style={{ marginBottom: '32px', textAlign: 'center' }}>
              <p style={{ color: '#64748B' }}>我的「論點」餘額</p>
              <p style={{ fontSize: '36px', fontWeight: '900', color: '#0097B2' }}>{profile.points} <span style={{ fontSize: '15px' }}>點</span></p>
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginTop: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>出示此安全碼進行兌換</h3>
                <div style={{ display: 'inline-block', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '16px' }}><QRCodeSVG value={profile.qr_token} size={150} /></div>
              </div>
            </div>

            <h2 className="custom-h2">獎品列表</h2>
            <div className="custom-card" style={{ padding: '24px', marginBottom: '32px' }}>
              {rewards.map((reward, index) => {
                const isPending = pendingRewardIds.includes(reward.id);
                const canAfford = profile.points >= reward.points_required;
                return (
                  <div key={reward.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index === rewards.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                    <div style={{ flexGrow: 1, paddingRight: '12px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>{reward.title}</h4>
                      <p style={{ fontSize: '15px', color: '#475569', margin: '6px 0 0 0' }}>{reward.description}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '80px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{reward.points_required} 點</span>
                      {isPending ? (
                        <button disabled className="btn-redeem btn-redeem-pending">已申請</button>
                      ) : canAfford ? (
                        <button onClick={() => handleRedeemRequestSubmit(reward.id)} disabled={loadingId === reward.id} className="btn-redeem btn-redeem-active">兌換</button>
                      ) : (
                        <button disabled className="btn-redeem btn-redeem-disabled">點數不足</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
