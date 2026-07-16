'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
}

export default function MemberDashboardClient({ profile, rewards }: MemberDashboardClientProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(60);
  const [dynamicQrValue, setDynamicQrValue] = useState('');

  useEffect(() => {
    const generateDynamicQR = () => {
      const timeSlice = Math.floor(Date.now() / 60000); // 60秒
      setDynamicQrValue(`${profile.qr_token}:${timeSlice}`);
    };

    generateDynamicQR();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateDynamicQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile.qr_token]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper">
        <header style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>你好，{profile.name}</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>歡迎回到辯論社論點系統</p>
          </div>
          <button onClick={handleLogout} className="custom-btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}>
            登出
          </button>
        </header>

        {/* 餘額卡片 */}
        <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', margin: '0 0 8px 0' }}>我的「論點」餘額</p>
          <p style={{ fontSize: '48px', fontWeight: '900', color: '#0097B2', textAlign: 'center', margin: 0 }}>
            {profile.points} <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#475569' }}>點</span>
          </p>
        </div>

        {/* 動態安全驗證碼 */}
        <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B', margin: '0 0 4px 0' }}>出示此即時安全碼進行兌換</h3>
          <p style={{ fontSize: '13px', color: '#0097B2', fontWeight: 'bold', margin: '0 0 16px 0' }}>條碼將在 {timeLeft} 秒後自動更新</p>
          
          {/* 動態進度條 */}
          <div style={{ width: '160px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '9999px', margin: '0 auto 16px auto', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                backgroundColor: '#0097B2', 
                width: `${(timeLeft / 60) * 100}%`,
                transition: 'width 1s linear'
              }}
            ></div>
          </div>

          <div style={{ display: 'inline-block', backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            {dynamicQrValue && <QRCodeSVG value={dynamicQrValue} size={150} />}
          </div>
          <p style={{ fontSize: '11px', color: '#64748B', marginTop: '16px', fontWeight: '300' }}>動態安全防偽技術，截圖畫面無法進行掃描</p>
        </div>

        {/* 獎品清單 */}
        <div>
          <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>可兌換獎品</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rewards.map(reward => (
              <div key={reward.id} className="custom-card" style={{ maxWidth: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>{reward.title}</h4>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>{reward.description}</p>
                </div>
                <div>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', backgroundColor: profile.points >= reward.points_required ? '#ECFDF5' : '#FEF2F2', color: profile.points >= reward.points_required ? '#059669' : '#EF4444' }}>
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
