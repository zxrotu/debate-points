'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Telescope } from 'lucide-react';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
  transactions: any[]; // 💡 補上此型態宣告
}

export default function MemberDashboardClient({ profile, rewards, transactions }: MemberDashboardClientProps) {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        'reader-student',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0],
          videoConstraints: {
            facingMode: "environment"
          }
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          if (scanner) {
            scanner.clear().catch(err => console.error(err));
          }
          setShowScanner(false);

          let claimId = decodedText;
          if (decodedText.includes('?id=')) {
            const urlParts = decodedText.split('?id=');
            claimId = urlParts[1];
          }

          setScanMessage({ text: '安全碼驗證中...', type: 'info' });

          try {
            const res = await fetch('/api/member/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ claim_id: claimId }),
            });
            const data = await res.json();

            if (res.ok) {
              setScanMessage({ 
                text: `成功領取【${data.title}】的 ${data.points_added} 點！目前餘額：${data.new_points} 點`, 
                type: 'success' 
              });
              router.refresh();
            } else {
              if (data.error === 'ALREADY_CLAIMED') {
                setScanMessage({ text: `您先前已領取過【${data.title}】囉，請勿重複掃描`, type: 'error' });
              } else {
                setScanMessage({ text: '領取失敗！此二維碼已過期或活動不存在', type: 'error' });
              }
            }
          } catch (err) {
            setScanMessage({ text: '網路連線異常，領取失敗', type: 'error' });
          }
        },
        (error) => {}
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Scanner clear error", err));
      }
    };
  }, [showScanner]);

  const formatDate = (dateStr: string) => {
    try {
      const datePart = dateStr.substring(0, 10);
      const timePart = dateStr.substring(11, 16);
      return `${datePart} ${timePart}`;
    } catch (err) {
      return dateStr;
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper">
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>
              Hello! {profile.name}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => { setShowHistory(!showHistory); setShowScanner(false); setScanMessage({ text: '', type: '' }); }} 
              className="custom-btn-logout"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px',
                backgroundColor: showHistory ? '#0097B2' : '#FFFFFF',
                color: showHistory ? '#FFFFFF' : '#0097B2',
                borderColor: '#0097B2'
              }}
              title="歷史紀錄"
            >
              <Telescope size={16} />
            </button>
            <button 
              onClick={() => { setShowScanner(!showScanner); setShowHistory(false); setScanMessage({ text: '', type: '' }); }} 
              className="custom-btn-logout"
              style={{ 
                backgroundColor: showScanner ? '#0097B2' : '#FFFFFF', 
                color: showScanner ? '#FFFFFF' : '#0097B2', 
                borderColor: '#0097B2' 
              }}
            >
              {showScanner ? '關閉' : '掃描'}
            </button>
            <button onClick={handleLogout} className="custom-btn-logout">
              登出
            </button>
          </div>
        </header>

        {scanMessage.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: scanMessage.type === 'success' ? '#ECFDF5' : scanMessage.type === 'info' ? '#F1FAFC' : '#FEF2F2', borderColor: scanMessage.type === 'success' ? '#10B981' : scanMessage.type === 'info' ? '#0097B2' : '#F87171', color: scanMessage.type === 'success' ? '#047857' : scanMessage.type === 'info' ? '#0097B2' : '#B91C1C', fontWeight: 'bold' }}>
            {scanMessage.text}
          </div>
        )}

        {showScanner && (
          <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，對準大螢幕的加點 QR Code</p>
            <div id="reader-student" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
          </div>
        )}

        {showHistory && (
          <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '32px', padding: '24px' }}>
            <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center', marginBottom: '16px' }}>論點異動歷史紀錄</h3>
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', margin: 0 }}>目前尚無任何論點異動紀錄</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {transactions.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid #E2E8F0', fontSize: '14px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', color: '#1E293B' }}>{t.reason}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{formatDate(t.created_at)}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: t.amount > 0 ? '#10B981' : '#EF4444' }}>
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 整合一體化大卡片 */}
        <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '32px', marginTop: '0px', textAlign: 'center', padding: '24px' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 4px 0' }}>我的「論點」餘額</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#0097B2', margin: '0 0 16px 0' }}>
            {profile.points} <span style={{ fontSize: '15px', fontWeight: 'normal', color: '#475569' }}>點</span>
          </p>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B', margin: '0 0 12px 0' }}>出示此安全碼進行兌換</h3>
            <div style={{ display: 'inline-block', backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <QRCodeSVG value={profile.qr_token} size={150} />
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', marginTop: '14px', fontWeight: '300', marginBottom: '0px' }}>點數不可轉贈他人</p>
          </div>
        </div>

        {/* 唯讀獎品清單 */}
        <div>
          <h2 className="custom-h2" style={{ paddingLeft: '8px', fontSize: '18px', marginBottom: '12px' }}>獎品列表</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rewards.map(reward => {
              const canAfford = profile.points >= reward.points_required;

              return (
                <div key={reward.id} className="custom-card" style={{ maxWidth: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                  <div style={{ flexGrow: 1, paddingRight: '12px', textAlign: 'left' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>{reward.title}</h4>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>{reward.description}</p>
                  </div>
                  <div>
                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', backgroundColor: canAfford ? '#ECFDF5' : '#FEF2F2', color: canAfford ? '#059669' : '#EF4444' }}>
                      {reward.points_required} 點
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
