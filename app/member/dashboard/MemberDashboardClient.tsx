'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
}

export default function MemberDashboardClient({ profile, rewards }: MemberDashboardClientProps) {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // 💡 學生端內建相機掃碼邏輯：鎖死後鏡頭，掃描成功自動解析 URL 獲取活動 ID 並加點
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        'reader-student',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0], // 僅限鏡頭
          videoConstraints: {
            facingMode: "environment" // 鎖死後置主鏡頭
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

          // 防呆解析：支援直接掃描完整網址或純活動 ID
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
              router.refresh(); // 即時更新大卡片餘額
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
        (error) => {
          // 忽略掃描異常
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Scanner clear error", err));
      }
    };
  }, [showScanner]);

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper">
        
        {/* 標題欄：並排掃描與登出按鈕 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>
              Hello! {profile.name}
            </span>
          </div>
          {/* 💡 掃描按鈕與登出按鈕緊密並排 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => { setShowScanner(!showScanner); setScanMessage({ text: '', type: '' }); }} 
              className="custom-btn-logout"
              style={{ backgroundColor: '#0097B2', color: '#FFFFFF', borderColor: '#0097B2' }}
            >
              {showScanner ? '關閉' : '掃描'}
            </button>
            <button onClick={handleLogout} className="custom-btn-logout">
              登出
            </button>
          </div>
        </header>

        {/* 掃描反饋訊息 */}
        {scanMessage.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: scanMessage.type === 'success' ? '#ECFDF5' : scanMessage.type === 'info' ? '#F1FAFC' : '#FEF2F2', borderColor: scanMessage.type === 'success' ? '#10B981' : scanMessage.type === 'info' ? '#0097B2' : '#F87171', color: scanMessage.type === 'success' ? '#047857' : scanMessage.type === 'info' ? '#0097B2' : '#B91C1C', fontWeight: 'bold' }}>
            {scanMessage.text}
          </div>
        )}

        {/* 💡 學生端相機面板：點選「掃描」時在最上方流暢彈出，鎖死後鏡頭 */}
        {showScanner && (
          <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，對準大螢幕的加點 QR Code</p>
            <div id="reader-student" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
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
          <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>獎品列表</h2>
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
