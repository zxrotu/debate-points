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
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper">
        
        {/* 標題欄 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>
              Hello! {profile.name}
            </span>
          </div>
          <button onClick={handleLogout} className="custom-btn-logout">
            登出
          </button>
        </header>

        {/* 整合一體化卡片 */}
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

        {/* 獎品列表 */}
        <div>
          <h2 className="custom-h2" style={{ paddingLeft: '8px', fontSize: '18px', marginBottom: '12px' }}>獎品列表</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rewards.map(reward => {
              const canAfford = profile.points >= reward.points_required;

              return (
                <div key={reward.id} className="custom-card" style={{ maxWidth: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 auto 12px auto' }}>
                  <div style={{ flexGrow: 1, paddingRight: '12px', textAlign: 'left' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>{reward.title}</h4>
                    {/* 💡 說明的文字放大為 14px，字體顏色加深，更易讀 */}
                    <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>{reward.description}</p>
                  </div>
                  <div>
                    {/* 💡 點數放大為 15px 粗體，高對比 */}
                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '9999px', fontSize: '15px', fontWeight: 'bold', backgroundColor: canAfford ? '#ECFDF5' : '#FEF2F2', color: canAfford ? '#059669' : '#EF4444' }}>
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
