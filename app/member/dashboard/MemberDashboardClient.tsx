'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface MemberDashboardClientProps {
  profile: any;
  rewards: any[];
  pendingRewardIds: number[];
}

export default function MemberDashboardClient({ profile, rewards, pendingRewardIds }: MemberDashboardClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleRedeemRequest = async (rewardId: number) => {
    setLoadingId(rewardId);
    setSuccessMsg('');

    const res = await fetch('/api/member/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: rewardId }),
    });

    const data = await res.json();
    setLoadingId(null);

    if (res.ok) {
      setSuccessMsg('兌換申請已送出，請等待管理員核准');
      router.refresh();
    } else {
      alert(data.error || '申請失敗');
    }
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

        {successMsg && (
          <div style={{ padding: '12px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#047857', borderRadius: '12px', fontSize: '14px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>
            {successMsg}
          </div>
        )}

        {/* 💡 整合卡片：將論點餘額、進度條與 QR Code 完美整合成一個精緻的高對比白色卡片 */}
        <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '32px', marginTop: '0px', textAlign: 'center', padding: '24px' }}>
          
          {/* 上半部：餘額顯示 */}
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 4px 0' }}>我的「論點」餘額</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#0097B2', margin: '0 0 16px 0' }}>
            {profile.points} <span style={{ fontSize: '15px', fontWeight: 'normal', color: '#475569' }}>點</span>
          </p>

          {/* 分隔線與下半部：安全驗證碼 */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B', margin: '0 0 12px 0' }}>出示此安全碼進行兌換</h3>
            
            <div style={{ display: 'inline-block', backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <QRCodeSVG value={profile.qr_token} size={150} />
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', marginTop: '14px', fontWeight: '300', marginBottom: '0px' }}>點數不可轉贈他人</p>
          </div>

        </div>

        {/* 獎品清單 */}
        <div>
          <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>可兌換獎品</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rewards.map(reward => {
              const isPending = pendingRewardIds.includes(reward.id);
              const canAfford = profile.points >= reward.points_required;

              return (
                <div key={reward.id} className="custom-card" style={{ maxWidth: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                  <div style={{ flexGrow: 1, paddingRight: '12px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>{reward.title}</h4>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>{reward.description}</p>
                    <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', fontWeight: 'bold', color: '#0097B2' }}>
                      需要 {reward.points_required} 點
                    </span>
                  </div>
                  <div>
                    {isPending ? (
                      <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 'bold', backgroundColor: '#FEF3C7', padding: '8px 16px', borderRadius: '9999px' }}>
                        審核中
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRedeemRequest(reward.id)}
                        disabled={!canAfford || loadingId === reward.id}
                        className="custom-btn-primary"
                        style={{ 
                          width: 'auto', 
                          padding: '8px 16px', 
                          fontSize: '12px',
                          backgroundColor: canAfford ? '#0097B2' : '#CBD5E1',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          boxShadow: 'none'
                        }}
                      >
                        {loadingId === reward.id ? '申請中...' : '申請兌換'}
                      </button>
                    )}
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
